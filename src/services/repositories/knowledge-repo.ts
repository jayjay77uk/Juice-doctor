import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, type Result } from '../result';

/**
 * Knowledge repository — real ingestion + full-text retrieval over the
 * knowledge_documents / knowledge_chunks tables. Text is chunked and indexed;
 * retrieval is ranked Postgres FTS scoped to a specialist's assigned documents
 * (via ai_agent_knowledge_sources). The retrieval interface is embedding-ready:
 * adding a vector column later needs no caller change.
 */

const ORG = '00000000-0000-0000-0000-000000000001';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
}

type Row = Record<string, unknown>;

let cachedOwner: string | null = null;
async function systemOwnerId(sb: SupabaseClient): Promise<string> {
  if (cachedOwner) return cachedOwner;
  const admin = await sb.from('profiles').select('id').eq('role', 'administrator').limit(1).maybeSingle();
  let id = admin.data?.id as string | undefined;
  if (!id) {
    const any = await sb.from('profiles').select('id').limit(1).maybeSingle();
    id = any.data?.id as string | undefined;
  }
  if (id) cachedOwner = id;
  return id ?? NIL_UUID;
}

function slugify(s: string): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);
  return `${base || 'doc'}-${Date.now().toString(36)}`;
}

/** Split text into ~size-char chunks on word boundaries. */
function chunkText(text: string, size = 600): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(i + size, clean.length);
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end);
      if (lastSpace > i + size * 0.5) end = lastSpace;
    }
    chunks.push(clean.slice(i, end).trim());
    i = end;
  }
  return chunks.filter(Boolean);
}

export const knowledgeRepo = {
  /** Ingest raw text as a knowledge document assigned to an agent: create → chunk → index. */
  async ingestText(input: {
    agentId: string;
    title: string;
    text: string;
    sourceType?: string;
  }): Promise<Result<{ documentId: string; chunks: number }>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'The knowledge store is unavailable.' });
    const chunks = chunkText(input.text);
    if (!chunks.length) return err({ code: 'invalid', message: 'There is no text to ingest.' });

    const owner = await systemOwnerId(sb);
    const { data: doc, error: docErr } = await sb
      .from('knowledge_documents')
      .insert({
        organisation_id: ORG,
        title: input.title,
        slug: slugify(input.title),
        source_type: input.sourceType ?? 'manual',
        current_version: 1,
        publish_status: 'published',
        index_state: 'available',
        visibility: 'organisation',
        owner_id: owner,
      })
      .select('id')
      .single();
    if (docErr || !doc) return err({ code: 'unavailable', message: docErr?.message ?? 'Could not create the document.' });
    const documentId = String(doc.id);

    const rows = chunks.map((content, idx) => ({
      document_id: documentId,
      version: 1,
      chunk_index: idx,
      content,
      metadata: {},
    }));
    const { error: chunkErr } = await sb.from('knowledge_chunks').insert(rows);
    if (chunkErr) return err({ code: 'unavailable', message: chunkErr.message });

    await sb.from('ai_agent_knowledge_sources').insert({ agent_id: input.agentId, document_id: documentId, mode: 'include' });
    return ok({ documentId, chunks: chunks.length });
  },

  /** Document ids assigned to an agent (mode = include). */
  async assignedDocumentIds(sb: SupabaseClient, agentId: string): Promise<string[]> {
    const { data } = await sb
      .from('ai_agent_knowledge_sources')
      .select('document_id')
      .eq('agent_id', agentId)
      .eq('mode', 'include')
      .not('document_id', 'is', null);
    return (data ?? []).map((r: Row) => r.document_id).filter((v): v is string => typeof v === 'string');
  },

  /** Retrieve the top-k knowledge chunks for an agent via ranked full-text search. */
  async retrieve(agentId: string, query: string, k = 4): Promise<RetrievedChunk[]> {
    const sb = createAdminClient();
    if (!sb || !query.trim()) return [];
    const docIds = await knowledgeRepo.assignedDocumentIds(sb, agentId);
    if (!docIds.length) return [];

    // OR-match the query's significant terms (a single chunk rarely contains
    // every word of a natural-language question). Raw to_tsquery via textSearch.
    const terms = [...new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])];
    if (!terms.length) return [];
    const tsquery = terms.join(' | ');
    const { data, error } = await sb
      .from('knowledge_chunks')
      .select('document_id, content, chunk_index')
      .in('document_id', docIds)
      .textSearch('content_tsv', tsquery, { config: 'english' })
      .limit(k);
    if (error) return [];
    const chunks = (data ?? []) as Row[];
    if (!chunks.length) return [];

    const titles = await sb.from('knowledge_documents').select('id, title').in('id', docIds);
    const titleMap = new Map((titles.data ?? []).map((d: Row) => [String(d.id), String(d.title)]));
    return chunks.map((c) => ({
      documentId: String(c.document_id),
      documentTitle: titleMap.get(String(c.document_id)) ?? 'Document',
      content: String(c.content),
      chunkIndex: Number(c.chunk_index) || 0,
    }));
  },

  /** Documents assigned to an agent (for display). */
  async documentsForAgent(agentId: string): Promise<{ id: string; title: string }[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const docIds = await knowledgeRepo.assignedDocumentIds(sb, agentId);
    if (!docIds.length) return [];
    const { data } = await sb.from('knowledge_documents').select('id, title').in('id', docIds);
    return (data ?? []).map((d: Row) => ({ id: String(d.id), title: String(d.title) }));
  },
};
