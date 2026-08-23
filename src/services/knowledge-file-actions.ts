'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertRole } from '@/lib/auth/authorize';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateUpload, UPLOAD_CONSTRAINTS } from '@/lib/security/file-validation';
import { extractDocumentText } from '@/lib/knowledge/document-text';
import { agents } from './agents';
import { knowledgeRepo } from './repositories/knowledge-repo';
import { auditRepo } from './repositories/audit-repo';
import type { ActionResult } from './result';

const uploadSchema = z.object({
  title: z.string().min(2, 'Give the document a title.'),
  assignedSpecialistSlug: z.string().min(1, 'Assign this to a specialist.'),
  categoryId: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
});

function extension(name: string): 'pdf' | 'docx' | 'txt' | 'csv' | null {
  const ext = name.toLowerCase().split('.').pop();
  return ext === 'pdf' || ext === 'docx' || ext === 'txt' || ext === 'csv' ? ext : null;
}

/**
 * Knowledge ingestion accepts either a real file or pasted text. Files are
 * validated by extension/MIME/magic bytes, text is extracted server-side, then
 * the approved content is chunked/indexed through the existing retrieval seam.
 * The original file is stored privately when the knowledge bucket is available.
 */
export async function uploadKnowledgeDocumentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await assertRole('administrator');
  } catch {
    return { status: 'error', message: 'You do not have permission to upload knowledge.' };
  }

  const parsed = uploadSchema.safeParse({
    title: String(formData.get('title') ?? ''),
    assignedSpecialistSlug: String(formData.get('assignedSpecialistSlug') ?? ''),
    categoryId: String(formData.get('categoryId') ?? ''),
    description: String(formData.get('description') ?? ''),
    content: String(formData.get('content') ?? ''),
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Check the document details.', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const selectedFile = formData.get('file');
  const file = selectedFile instanceof File && selectedFile.size > 0 ? selectedFile : null;
  const pasted = parsed.data.content?.trim() ?? '';
  if (!file && !pasted) {
    return { status: 'error', message: 'Upload a PDF, DOCX, TXT or CSV file, or paste approved text to index.' };
  }

  const agentResult = await agents.bySlug(parsed.data.assignedSpecialistSlug);
  if (!agentResult.ok) return { status: 'error', message: 'The selected specialist could not be found.' };

  let text = pasted;
  let sourceType = 'manual';
  let fileBytes: Uint8Array | null = null;
  let fileExt: 'pdf' | 'docx' | 'txt' | 'csv' | null = null;

  if (file) {
    try {
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      validateUpload(
        { filename: file.name, mimeType: file.type, size: file.size, head },
        UPLOAD_CONSTRAINTS.knowledgeDocument,
      );
      fileExt = extension(file.name);
      if (!fileExt) return { status: 'error', message: 'Unsupported knowledge file type.' };
      text = await extractDocumentText(file);
      sourceType = fileExt;
      fileBytes = new Uint8Array(await file.arrayBuffer());
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'The file could not be validated or extracted.' };
    }
  }

  const ingested = await knowledgeRepo.ingestText({
    agentId: agentResult.data.id,
    title: parsed.data.title,
    text,
    sourceType,
  });
  if (!ingested.ok) return { status: 'error', message: ingested.error.message };

  const sb = createAdminClient();
  const documentId = ingested.data.documentId;
  let storedOriginal = false;
  let sourceUri: string | null = null;
  if (sb) {
    if (file && fileBytes && fileExt) {
      const path = `${documentId}/v1.${fileExt}`;
      const upload = await sb.storage.from('knowledge').upload(path, fileBytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (!upload.error) {
        sourceUri = `knowledge:${path}`;
        storedOriginal = true;
      }
    }
    await sb
      .from('knowledge_documents')
      .update({
        ...(parsed.data.categoryId ? { category_id: parsed.data.categoryId } : {}),
        ...(parsed.data.description ? { description: parsed.data.description.trim() } : {}),
        ...(sourceUri ? { source_uri: sourceUri } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
  }

  await auditRepo.log({
    actorId: session.user.id,
    action: 'knowledge.ingest',
    entityType: 'knowledge_documents',
    entityId: documentId,
    after: {
      specialistSlug: parsed.data.assignedSpecialistSlug,
      sourceType,
      chunks: ingested.data.chunks,
      originalFileStored: storedOriginal,
    },
  });

  revalidatePath('/admin/ai/knowledge');
  return {
    status: 'success',
    message: file
      ? `File validated, text extracted and indexed into ${ingested.data.chunks} retrieval chunks${storedOriginal ? '; the original is stored privately.' : '.'}`
      : `Text indexed into ${ingested.data.chunks} retrieval chunks.`,
  };
}
