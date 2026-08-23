import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

const ORG = '00000000-0000-0000-0000-000000000001';
const BUCKET = 'conversation-attachments';

export interface ConversationAttachment {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  downloadUrl: string | null;
}

async function ownsConversation(conversationId: string, userId: string): Promise<boolean> {
  const sb = createAdminClient();
  if (!sb) return false;
  const { data } = await sb
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

export const conversationAttachmentsRepo = {
  ownsConversation,

  async list(conversationId: string, userId: string): Promise<ConversationAttachment[]> {
    const sb = createAdminClient();
    if (!sb || !(await ownsConversation(conversationId, userId))) return [];
    const { data, error } = await sb
      .from('conversation_attachments')
      .select('id, filename, mime_type, byte_size, storage_path, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return Promise.all(
      (data ?? []).map(async (row) => {
        const signed = await sb.storage.from(BUCKET).createSignedUrl(String(row.storage_path), 300);
        return {
          id: String(row.id),
          filename: String(row.filename),
          mimeType: String(row.mime_type),
          byteSize: Number(row.byte_size),
          createdAt: String(row.created_at),
          downloadUrl: signed.error ? null : signed.data.signedUrl,
        };
      }),
    );
  },

  async add(input: {
    conversationId: string;
    userId: string;
    filename: string;
    mimeType: string;
    bytes: Uint8Array;
  }): Promise<{ id: string } | null> {
    const sb = createAdminClient();
    if (!sb || !(await ownsConversation(input.conversationId, input.userId))) return null;
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'attachment';
    const storagePath = `${input.userId}/${input.conversationId}/${crypto.randomUUID()}-${safeName}`;
    const upload = await sb.storage.from(BUCKET).upload(storagePath, input.bytes, {
      contentType: input.mimeType,
      upsert: false,
    });
    if (upload.error) return null;
    const { data, error } = await sb
      .from('conversation_attachments')
      .insert({
        organisation_id: ORG,
        conversation_id: input.conversationId,
        uploaded_by: input.userId,
        filename: input.filename.slice(0, 255),
        mime_type: input.mimeType,
        byte_size: input.bytes.byteLength,
        storage_path: storagePath,
      })
      .select('id')
      .single();
    if (error || !data) {
      await sb.storage.from(BUCKET).remove([storagePath]);
      return null;
    }
    return { id: String(data.id) };
  },

  async remove(id: string, conversationId: string, userId: string): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb || !(await ownsConversation(conversationId, userId))) return false;
    const { data } = await sb
      .from('conversation_attachments')
      .select('id, storage_path')
      .eq('id', id)
      .eq('conversation_id', conversationId)
      .eq('uploaded_by', userId)
      .maybeSingle();
    if (!data) return false;
    const removed = await sb.storage.from(BUCKET).remove([String(data.storage_path)]);
    if (removed.error) return false;
    const deleted = await sb.from('conversation_attachments').delete().eq('id', id).eq('uploaded_by', userId);
    return !deleted.error;
  },
};
