import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  KnowledgeDocument,
  KnowledgeSourceType,
  KnowledgeIndexState,
  KnowledgeVisibility,
  PublishStatus,
} from '@/types/knowledge';
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

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
}

type Row = Record<string, unknown>;

let cachedOwner: string | null = null;
/**
 * The profile that owns system-created documents (owner_id is NOT NULL with an
 * auth.users FK). Returns null when no profile exists — callers must fail with
 * an honest error rather than inserting an invalid owner.
 */
async function systemOwnerId(sb: SupabaseClient): Promise<string | null> {
  if (cachedOwner) return cachedOwner;
  const admin = await sb.from('profiles').select('id').eq('role', 'administrator').limit(1).maybeSingle();
  let id = admin.data?.id as string | undefined;
  if (!id) {
    const any = await sb.from('profiles').select('id').limit(1).maybeSingle();
    id = any.data?.id as string | undefined;
  }
  if (id) cachedOwner = id;
  return id ?? null;
}

/** Unique slug: normalised title + random suffix (slugs are unique per org). */
function slugify(s: string): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);
  return `${base || 'doc'}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
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
    if (!owner) return err({ code: 'unavailable', message: 'No administrator profile exists to own the document yet.' });
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

    // Version 1 is a real history row from the start, so later replacements
    // never orphan the original content.
    await sb.from('knowledge_document_versions').insert({
      document_id: documentId,
      version: 1,
      title: input.title,
      content: input.text,
      created_by: owner,
    });

    await sb.from('ai_agent_knowledge_sources').insert({ agent_id: input.agentId, document_id: documentId, mode: 'include' });
    return ok({ documentId, chunks: chunks.length });
  },

  /**
   * Replace a document's content with a NEW VERSION. The previous version's
   * full content stays on its knowledge_document_versions row (history is
   * never destroyed); only the retrieval derivatives (chunks) are rebuilt for
   * the new version.
   */
  async reingestText(documentId: string, input: { text: string; changeNote?: string | null }): Promise<Result<{ version: number; chunks: number }>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'The knowledge store is unavailable.' });
    const chunks = chunkText(input.text);
    if (!chunks.length) return err({ code: 'invalid', message: 'There is no text to ingest.' });

    const { data: doc } = await sb.from('knowledge_documents').select('id, title, current_version, owner_id').eq('id', documentId).maybeSingle();
    if (!doc) return err({ code: 'not_found', message: 'Document not found.' });

    const version = (Number(doc.current_version) || 1) + 1;
    const { error: verErr } = await sb.from('knowledge_document_versions').insert({
      document_id: documentId,
      version,
      title: String(doc.title),
      content: input.text,
      change_note: input.changeNote?.trim() || null,
      created_by: (doc.owner_id as string | null) ?? null,
    });
    if (verErr) return err({ code: 'unavailable', message: verErr.message });

    await sb.from('knowledge_chunks').delete().eq('document_id', documentId);
    const rows = chunks.map((content, idx) => ({ document_id: documentId, version, chunk_index: idx, content, metadata: {} }));
    const { error: chunkErr } = await sb.from('knowledge_chunks').insert(rows);
    if (chunkErr) return err({ code: 'unavailable', message: chunkErr.message });

    await sb
      .from('knowledge_documents')
      .update({ current_version: version, index_state: 'available', updated_at: new Date().toISOString() })
      .eq('id', documentId);
    return ok({ version, chunks: rows.length });
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

  /**
   * Retrieve the top-k knowledge chunks for an agent via RANKED full-text
   * search (ts_rank, migration 0029), restricted to published + available
   * documents — archived or paused documents never ground a live answer.
   */
  async retrieve(agentId: string, query: string, k = 4): Promise<RetrievedChunk[]> {
    const sb = createAdminClient();
    if (!sb || !query.trim()) return [];

    // OR-match the query's significant terms (a single chunk rarely contains
    // every word of a natural-language question). Capped so a very long pasted
    // message cannot blow up the tsquery.
    const terms = [...new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].slice(0, 24);
    if (!terms.length) return [];
    const tsquery = terms.join(' | ');

    const docIds = await knowledgeRepo.assignedDocumentIds(sb, agentId);
    if (!docIds.length) return [];
    // Only published + available documents may ground answers.
    const { data: docRows } = await sb
      .from('knowledge_documents')
      .select('id, title')
      .in('id', docIds)
      .eq('publish_status', 'published')
      .eq('index_state', 'available');
    const titleMap = new Map((docRows ?? []).map((d: Row) => [String(d.id), String(d.title)]));
    if (!titleMap.size) return [];

    // Ranked path (SQL function applies ts_rank ordering + the same state
    // filter); falls back to unranked matching over the pre-filtered document
    // set if the function is missing, so retrieval never hard-fails.
    let chunks: Row[];
    const { data: ranked, error: rankErr } = await sb.rpc('search_knowledge_chunks', { p_agent: agentId, p_query: tsquery, p_k: k });
    if (!rankErr && Array.isArray(ranked)) {
      chunks = (ranked as Row[]).filter((c) => titleMap.has(String(c.document_id)));
    } else {
      const { data, error } = await sb
        .from('knowledge_chunks')
        .select('document_id, content, chunk_index')
        .in('document_id', [...titleMap.keys()])
        .textSearch('content_tsv', tsquery, { config: 'english' })
        .limit(k);
      if (error) return [];
      chunks = (data ?? []) as Row[];
    }
    return chunks.slice(0, k).map((c) => ({
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

  // ── Document management (admin knowledge list) ─────────────────────────────

  async listDocuments(): Promise<KnowledgeDocument[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('knowledge_documents').select('*').eq('organisation_id', ORG).order('created_at', { ascending: false });
    const docs = (data ?? []) as Row[];
    const slugMap = await docSpecialistMap(sb, docs.map((d) => String(d.id)));
    return docs.map((d) => rowToDocument(d, slugMap));
  },

  async getDocument(id: string): Promise<KnowledgeDocument | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data } = await sb.from('knowledge_documents').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    const slugMap = await docSpecialistMap(sb, [id]);
    return rowToDocument(data as Row, slugMap);
  },

  async archiveDocument(id: string): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { error } = await sb
      .from('knowledge_documents')
      .update({ publish_status: 'archived', index_state: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  },

  async restoreDocument(id: string): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { error } = await sb
      .from('knowledge_documents')
      .update({ publish_status: 'draft', index_state: 'available', updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  },


  // ── Workflow operations (admin document controls) — all real rows ──────────

  /** Documents assigned to a specialist, resolved by agent slug. */
  async forSpecialistSlug(slug: string): Promise<KnowledgeDocument[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data: agent } = await sb.from('ai_agents').select('id').eq('slug', slug).eq('organisation_id', ORG).maybeSingle();
    if (!agent?.id) return [];
    const docIds = await knowledgeRepo.assignedDocumentIds(sb, String(agent.id));
    if (!docIds.length) return [];
    const { data } = await sb.from('knowledge_documents').select('*').in('id', docIds).order('created_at', { ascending: false });
    const docs = (data ?? []) as Row[];
    const slugMap = await docSpecialistMap(sb, docs.map((d) => String(d.id)));
    return docs.map((d) => rowToDocument(d, slugMap));
  },

  async getDocumentBySlug(slug: string): Promise<KnowledgeDocument | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data } = await sb.from('knowledge_documents').select('*').eq('organisation_id', ORG).eq('slug', slug).maybeSingle();
    if (!data) return null;
    const slugMap = await docSpecialistMap(sb, [String(data.id)]);
    return rowToDocument(data as Row, slugMap);
  },

  /** Create a metadata-only document (content ingestion happens via ingestText). */
  async createDocument(input: {
    title: string;
    sourceType: string;
    assignedSpecialistSlug: string;
    categoryId: string | null;
    description?: string | null;
  }): Promise<KnowledgeDocument | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    // owner_id is NOT NULL — a metadata-only insert without it always failed.
    const owner = await systemOwnerId(sb);
    if (!owner) return null;
    const { data, error } = await sb
      .from('knowledge_documents')
      .insert({
        organisation_id: ORG,
        title: input.title.trim(),
        slug: slugify(input.title),
        description: input.description?.trim() || null,
        source_type: input.sourceType,
        category_id: input.categoryId,
        publish_status: 'draft',
        index_state: 'uploaded',
        visibility: 'organisation',
        owner_id: owner,
      })
      .select('*')
      .single();
    if (error || !data) return null;
    if (input.assignedSpecialistSlug) await knowledgeRepo.assignSpecialist(String(data.id), input.assignedSpecialistSlug);
    return knowledgeRepo.getDocument(String(data.id));
  },

  async setIndexState(id: string, state: string): Promise<KnowledgeDocument | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { error } = await sb.from('knowledge_documents').update({ index_state: state, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return null;
    return knowledgeRepo.getDocument(id);
  },

  /**
   * Pause/resume a document in the specialist's brain without archiving.
   * Only toggles between indexed ⇄ available — a document still moving
   * through the pipeline (uploaded/processing/failed) or archived must not
   * jump straight to available.
   */
  async setActive(id: string, active: boolean): Promise<KnowledgeDocument | null> {
    const doc = await knowledgeRepo.getDocument(id);
    if (!doc) return null;
    if (doc.indexState !== 'indexed' && doc.indexState !== 'available') return doc;
    return knowledgeRepo.setIndexState(id, active ? 'available' : 'indexed');
  },

  /** Publishing-workflow transition (validated by the caller with canTransition). */
  async transition(id: string, to: string, approvedBy?: string | null): Promise<KnowledgeDocument | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const patch: Record<string, unknown> = { publish_status: to, updated_at: new Date().toISOString() };
    if (to === 'published') {
      patch.approved_by = approvedBy ?? null;
      patch.approved_at = new Date().toISOString();
    }
    const { error } = await sb.from('knowledge_documents').update(patch).eq('id', id);
    if (error) return null;
    return knowledgeRepo.getDocument(id);
  },

  /** Reassign a document to a specialist's brain (replaces prior assignment). */
  async assignSpecialist(id: string, slug: string): Promise<KnowledgeDocument | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data: agent } = await sb.from('ai_agents').select('id').eq('slug', slug).eq('organisation_id', ORG).maybeSingle();
    if (!agent?.id) return null;
    await sb.from('ai_agent_knowledge_sources').delete().eq('document_id', id);
    await sb.from('ai_agent_knowledge_sources').insert({ agent_id: agent.id, document_id: id });
    return knowledgeRepo.getDocument(id);
  },

  /** Real document versions (empty until versioning is used). */
  async versions(documentId: string): Promise<{ id: string; documentId: string; version: number; title: string; content: string | null; storagePath: string | null; changeNote: string | null; createdBy: string | null; createdAt: string }[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('knowledge_document_versions').select('*').eq('document_id', documentId).order('version', { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      documentId: String(r.document_id),
      version: Number(r.version) || 1,
      title: String(r.title ?? ''),
      content: (r.content as string | null) ?? null,
      storagePath: (r.storage_path as string | null) ?? null,
      changeNote: (r.change_note as string | null) ?? null,
      createdBy: (r.created_by as string | null) ?? null,
      createdAt: String(r.created_at),
    }));
  },

  /** Real categories (idempotently seeded once as configuration rows). */
  async categories(): Promise<import('@/types/knowledge').KnowledgeCategory[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { count } = await sb.from('knowledge_categories').select('id', { count: 'exact', head: true }).eq('organisation_id', ORG);
    if ((count ?? 0) === 0) {
      await sb.from('knowledge_categories').insert([
        { organisation_id: ORG, slug: 'guides', name: 'Guides', sort_order: 1 },
        { organisation_id: ORG, slug: 'reference', name: 'Reference', sort_order: 2 },
        { organisation_id: ORG, slug: 'onboarding', name: 'Onboarding', sort_order: 3 },
        { organisation_id: ORG, slug: 'internal', name: 'Internal', sort_order: 4 },
      ]);
    }
    const { data } = await sb.from('knowledge_categories').select('*').eq('organisation_id', ORG).order('sort_order');
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      organisationId: String(r.organisation_id),
      parentId: (r.parent_id as string | null) ?? null,
      slug: String(r.slug),
      name: String(r.name),
      description: (r.description as string | null) ?? null,
      sortOrder: Number(r.sort_order) || 0,
      status: (r.status as 'draft' | 'active' | 'archived' | 'deleted') ?? 'active',
    }));
  },

  /** Real collections with REAL document counts — every field from the row. */
  async collections(): Promise<
    { id: string; organisationId: string; slug: string; name: string; description: string | null; documentCount: number; status: string; updatedAt: string }[]
  > {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('knowledge_collections').select('*').eq('organisation_id', ORG).order('created_at');
    const rows = (data ?? []) as Row[];
    if (!rows.length) return [];
    const { data: links } = await sb
      .from('knowledge_collection_documents')
      .select('collection_id')
      .in('collection_id', rows.map((r) => String(r.id)));
    const counts = new Map<string, number>();
    for (const l of (links ?? []) as Row[]) {
      const id = String(l.collection_id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return rows.map((r) => ({
      id: String(r.id),
      organisationId: String(r.organisation_id),
      slug: String(r.slug ?? r.id),
      name: String(r.name),
      description: (r.description as string | null) ?? null,
      documentCount: counts.get(String(r.id)) ?? 0,
      status: String(r.status ?? 'active'),
      updatedAt: String(r.updated_at ?? r.created_at ?? ''),
    }));
  },

  async documentStats(): Promise<{ total: number; published: number; inReview: number; drafts: number; archived: number }> {
    const sb = createAdminClient();
    if (!sb) return { total: 0, published: 0, inReview: 0, drafts: 0, archived: 0 };
    const { data } = await sb.from('knowledge_documents').select('publish_status').eq('organisation_id', ORG);
    const rows = (data ?? []) as Row[];
    const by = (s: string) => rows.filter((r) => r.publish_status === s).length;
    return { total: rows.length, published: by('published'), inReview: by('in_review'), drafts: by('draft'), archived: by('archived') };
  },
};

function rowToDocument(r: Row, slugMap: Map<string, string>): KnowledgeDocument {
  const id = String(r.id);
  const indexState = String(r.index_state) as KnowledgeIndexState;
  return {
    id,
    organisationId: String(r.organisation_id),
    categoryId: (r.category_id as string | null) ?? null,
    assignedSpecialistSlug: slugMap.get(id) ?? null,
    title: String(r.title),
    slug: String(r.slug),
    description: (r.description as string | null) ?? null,
    sourceType: String(r.source_type) as KnowledgeSourceType,
    sourceUri: (r.source_uri as string | null) ?? null,
    currentVersion: Number(r.current_version) || 1,
    publishStatus: String(r.publish_status) as PublishStatus,
    indexState,
    // A document is active in the brain only when retrievable — matches the
    // retrieval filter and makes setActive(false) ('indexed') really pause it.
    active: indexState === 'available',
    errorMessage: null,
    visibility: String(r.visibility) as KnowledgeVisibility,
    ownerId: String(r.owner_id),
    approvedBy: (r.approved_by as string | null) ?? null,
    approvedAt: (r.approved_at as string | null) ?? null,
    tags: [],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

/** Map document id → assigned specialist slug (via ai_agent_knowledge_sources). */
async function docSpecialistMap(sb: SupabaseClient, docIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!docIds.length) return map;
  const { data: links } = await sb
    .from('ai_agent_knowledge_sources')
    .select('document_id, agent_id')
    .in('document_id', docIds)
    .not('document_id', 'is', null);
  const rows = (links ?? []) as Row[];
  const agentIds = [...new Set(rows.map((l) => String(l.agent_id)))];
  if (!agentIds.length) return map;
  const { data: ag } = await sb.from('ai_agents').select('id, slug').in('id', agentIds);
  const agentSlug = new Map((ag ?? []).map((a: Row) => [String(a.id), String(a.slug)]));
  for (const l of rows) {
    const slug = agentSlug.get(String(l.agent_id));
    if (slug) map.set(String(l.document_id), slug);
  }
  return map;
}
