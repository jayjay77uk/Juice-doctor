'use server';

import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { validateUpload, UPLOAD_CONSTRAINTS } from '@/lib/security/file-validation';
import { conversationAttachmentsRepo } from './repositories/conversation-attachments-repo';
import { extractDocumentText } from '@/lib/knowledge/document-text';
import { auditRepo } from './repositories/audit-repo';
import type { ActionResult } from './result';

export async function uploadConversationAttachmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await assertSession();
  } catch {
    return { status: 'error', message: 'Please sign in.' };
  }
  const conversationId = String(formData.get('conversationId') ?? '');
  const entry = formData.get('file');
  const file = entry instanceof File && entry.size > 0 ? entry : null;
  if (!conversationId || !file) return { status: 'error', message: 'Choose a file to attach.' };
  if (!(await conversationAttachmentsRepo.ownsConversation(conversationId, session.user.id))) {
    return { status: 'error', message: 'Conversation not found.' };
  }

  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    validateUpload(
      { filename: file.name, mimeType: file.type, size: file.size, head },
      UPLOAD_CONSTRAINTS.chatAttachment,
    );
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'That file cannot be attached.' };
  }

  // Extract the text ONCE, here, so the specialist can actually read the file
  // on every later turn without re-parsing it. Images need OCR/vision, so they
  // are honestly recorded as unsupported rather than silently ignored.
  const isImage = file.type.startsWith('image/');
  let extraction: { state: 'extracted' | 'unsupported' | 'failed'; text?: string; error?: string };
  if (isImage) {
    extraction = { state: 'unsupported', error: 'Images need text recognition, which is not connected yet.' };
  } else {
    try {
      const text = await extractDocumentText(file);
      extraction = { state: 'extracted', text: text.slice(0, 200_000) };
    } catch (error) {
      extraction = { state: 'failed', error: error instanceof Error ? error.message.slice(0, 300) : 'Could not read this file.' };
    }
  }

  const added = await conversationAttachmentsRepo.add({
    conversationId,
    userId: session.user.id,
    filename: file.name,
    mimeType: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
    extraction,
  });
  if (!added) return { status: 'error', message: 'The attachment could not be stored.' };

  await auditRepo.log({
    actorId: session.user.id,
    action: 'conversation.attachment.added',
    entityType: 'conversation_attachments',
    entityId: added.id,
    after: { conversationId, filename: file.name, mimeType: file.type, byteSize: file.size },
  });
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  return {
    status: 'success',
    message:
      extraction.state === 'extracted'
        ? 'Attached — your specialist can read this file.'
        : extraction.state === 'unsupported'
          ? 'Attached and saved securely. Images cannot be read by your specialist yet — describe what it shows, or upload a PDF, DOCX, TXT or CSV.'
          : `Attached and saved securely, but your specialist could not read it: ${extraction.error ?? 'unreadable file'}`,
  };
}

export async function deleteConversationAttachmentAction(formData: FormData): Promise<void> {
  const session = await assertSession();
  const conversationId = String(formData.get('conversationId') ?? '');
  const id = String(formData.get('id') ?? '');
  if (!conversationId || !id) return;
  const removed = await conversationAttachmentsRepo.remove(id, conversationId, session.user.id);
  if (removed) {
    await auditRepo.log({
      actorId: session.user.id,
      action: 'conversation.attachment.deleted',
      entityType: 'conversation_attachments',
      entityId: id,
      after: { conversationId },
    });
  }
  revalidatePath(`/dashboard/conversations/${conversationId}`);
}
