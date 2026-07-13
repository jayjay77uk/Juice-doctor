import 'server-only';

import type {
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeDocumentVersion,
  KnowledgeIndexState,
  KnowledgeSourceType,
  PublishStatus,
} from '@/types/knowledge';
import type { KnowledgeCollection } from '@/types/ai-platform';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { knowledgeRepo } from './repositories/knowledge-repo';
import { ok, err, type Page, type Result } from './result';
import type { ListQuery } from './index';

/**
 * Knowledge management — the per-specialist knowledge-brain read/write layer.
 * Two DISTINCT state machines: `publishStatus` (editorial) and `indexState`
 * (retrieval readiness — a document is INDEXED, never "trained"). Documents are
 * assigned to a specialist AI's brain. Prototype uses in-process seed data;
 * production reads the knowledge_* tables (migrations 0012 + 0014). No ingestion
 * or embeddings run here — the state machine models the pipeline accurately.
 */

export const PUBLISH_TRANSITIONS: Record<PublishStatus, PublishStatus[]> = {
  draft: ['in_review', 'archived'],
  in_review: ['approved', 'rejected', 'draft'],
  approved: ['published', 'in_review'],
  published: ['archived'],
  rejected: ['draft', 'archived'],
  archived: ['draft'],
};

export function canTransition(from: PublishStatus, to: PublishStatus): boolean {
  return PUBLISH_TRANSITIONS[from].includes(to);
}

/** The happy-path indexing pipeline (uploaded → processing → indexed → available). */
const INDEX_NEXT: Partial<Record<KnowledgeIndexState, KnowledgeIndexState>> = {
  uploaded: 'processing',
  processing: 'indexed',
  indexed: 'available',
};

const ORG = '00000000-0000-0000-0000-000000000001';
const TS = '2026-07-10T00:00:00.000Z';
let docCounter = 0;

const SEED_CATEGORIES: KnowledgeCategory[] = [
  { id: 'cat_1', organisationId: ORG, parentId: null, slug: 'category-one', name: 'Category One', description: 'Core guidance.', sortOrder: 0, status: 'active' },
  { id: 'cat_2', organisationId: ORG, parentId: null, slug: 'category-two', name: 'Category Two', description: null, sortOrder: 1, status: 'active' },
  { id: 'cat_3', organisationId: ORG, parentId: null, slug: 'category-three', name: 'Category Three', description: null, sortOrder: 2, status: 'active' },
  { id: 'cat_4', organisationId: ORG, parentId: null, slug: 'category-four', name: 'Category Four', description: 'Onboarding + triage material.', sortOrder: 3, status: 'active' },
];

function doc(
  partial: Partial<KnowledgeDocument> &
    Pick<KnowledgeDocument, 'id' | 'title' | 'slug' | 'sourceType' | 'publishStatus' | 'categoryId' | 'assignedSpecialistSlug'>,
): KnowledgeDocument {
  return {
    organisationId: ORG,
    description: null,
    sourceUri: null,
    currentVersion: 1,
    indexState: partial.publishStatus === 'published' ? 'available' : 'uploaded',
    active: true,
    errorMessage: null,
    visibility: 'organisation',
    ownerId: 'usr_admin',
    approvedBy: partial.publishStatus === 'published' ? 'usr_admin' : null,
    approvedAt: partial.publishStatus === 'published' ? TS : null,
    tags: [],
    createdAt: TS,
    updatedAt: TS,
    ...partial,
  };
}

const documents: KnowledgeDocument[] = [
  doc({ id: 'doc_1', title: 'Overview', slug: 'document-one', sourceType: 'pdf', publishStatus: 'published', categoryId: 'cat_1', assignedSpecialistSlug: 'makela', description: 'A placeholder overview document for this specialist.', tags: ['overview'], visibility: 'organisation' }),
  doc({ id: 'doc_2', title: 'Getting Started Guide', slug: 'document-two', sourceType: 'docx', publishStatus: 'published', categoryId: 'cat_3', assignedSpecialistSlug: 'makela', description: 'A concise introduction to the basics.', tags: ['guide', 'basics'] }),
  doc({ id: 'doc_3', title: 'Reference Notes', slug: 'document-three', sourceType: 'manual', publishStatus: 'in_review', categoryId: 'cat_2', assignedSpecialistSlug: 'serena', description: 'Structured reference notes.', tags: ['reference'], indexState: 'indexed' }),
  doc({ id: 'doc_4', title: 'Intro Recording', slug: 'document-four', sourceType: 'audio', publishStatus: 'approved', categoryId: 'cat_1', assignedSpecialistSlug: 'aqua', tags: ['audio'], indexState: 'processing' }),
  doc({ id: 'doc_5', title: 'Intake Questionnaire Reference', slug: 'document-five', sourceType: 'txt', publishStatus: 'draft', categoryId: 'cat_4', assignedSpecialistSlug: 'sage', description: 'Reference answers for the intake flow.', visibility: 'private', indexState: 'uploaded' }),
  doc({ id: 'doc_6', title: 'Old FAQ', slug: 'document-six', sourceType: 'txt', publishStatus: 'archived', categoryId: 'cat_2', assignedSpecialistSlug: 'serena', tags: ['faq'], indexState: 'archived', active: false }),
];

const collections: KnowledgeCollection[] = [
  { id: 'col_1', organisationId: ORG, slug: 'collection-one', name: 'Collection One', description: 'A curated set of sources.', documentCount: 3, status: 'active', updatedAt: TS },
  { id: 'col_2', organisationId: ORG, slug: 'collection-two', name: 'Collection Two', description: 'Another curated set of sources.', documentCount: 2, status: 'active', updatedAt: TS },
];

function nowIso() {
  return new Date().toISOString();
}

function find(id: string): KnowledgeDocument | undefined {
  return documents.find((d) => d.id === id);
}

export const knowledge = {
  categories: {
    async list(): Promise<Result<KnowledgeCategory[]>> {
      return ok(SEED_CATEGORIES);
    },
  },

  collections: {
    async list(): Promise<Result<KnowledgeCollection[]>> {
      return ok([...collections]);
    },
  },

  documents: {
    async list(
      q: ListQuery & { status?: PublishStatus; categoryId?: string; specialistSlug?: string } = {},
    ): Promise<Result<Page<KnowledgeDocument>>> {
      let rows = isSupabaseAdminConfigured() ? await knowledgeRepo.listDocuments() : [...documents];
      if (q.status) rows = rows.filter((d) => d.publishStatus === q.status);
      if (q.categoryId) rows = rows.filter((d) => d.categoryId === q.categoryId);
      if (q.specialistSlug) rows = rows.filter((d) => d.assignedSpecialistSlug === q.specialistSlug);
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok({ items: rows, nextCursor: null });
    },
    /** All documents in a specialist AI's knowledge brain. */
    async forSpecialist(slug: string): Promise<Result<KnowledgeDocument[]>> {
      return ok(documents.filter((d) => d.assignedSpecialistSlug === slug).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    /** Documents that are live in a specialist's brain (active + available). */
    async availableForSpecialist(slug: string): Promise<Result<KnowledgeDocument[]>> {
      return ok(documents.filter((d) => d.assignedSpecialistSlug === slug && d.active && d.indexState === 'available'));
    },
    async byId(id: string): Promise<Result<KnowledgeDocument>> {
      if (isSupabaseAdminConfigured()) {
        const doc = await knowledgeRepo.getDocument(id);
        return doc ? ok(doc) : err({ code: 'not_found', message: 'Document not found.' });
      }
      const match = find(id);
      return match ? ok(match) : err({ code: 'not_found', message: 'Document not found.' });
    },
    async bySlug(slug: string): Promise<Result<KnowledgeDocument>> {
      const match = documents.find((d) => d.slug === slug);
      return match ? ok(match) : err({ code: 'not_found', message: `No knowledge document '${slug}'.` });
    },
    async versions(id: string): Promise<Result<KnowledgeDocumentVersion[]>> {
      const document = find(id);
      if (!document) return err({ code: 'not_found', message: 'Document not found.' });
      return ok([
        { id: `${id}_v1`, documentId: id, version: 1, title: document.title, content: null, storagePath: document.sourceUri, changeNote: 'Initial import', createdBy: document.ownerId, createdAt: TS },
      ]);
    },

    /** Upload a new document into a specialist's knowledge brain (mock). */
    async create(input: {
      title: string;
      sourceType: KnowledgeSourceType;
      assignedSpecialistSlug: string;
      categoryId: string | null;
      description?: string;
    }): Promise<Result<KnowledgeDocument>> {
      if (!input.title.trim()) return err({ code: 'invalid', message: 'A title is required.' });
      const id = `doc_new_${++docCounter}`;
      const document = doc({
        id,
        title: input.title.trim(),
        slug: `document-${id}`,
        sourceType: input.sourceType,
        publishStatus: 'draft',
        categoryId: input.categoryId,
        assignedSpecialistSlug: input.assignedSpecialistSlug,
        description: input.description?.trim() || null,
        indexState: 'uploaded',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      documents.unshift(document);
      return ok(document);
    },

    /** Advance the indexing pipeline one accurate step (never "training"). */
    async advanceIndex(id: string): Promise<Result<KnowledgeDocument>> {
      const document = find(id);
      if (!document) return err({ code: 'not_found', message: 'Document not found.' });
      const next = INDEX_NEXT[document.indexState];
      if (!next) return err({ code: 'invalid', message: `Cannot advance from '${document.indexState}'.` });
      document.indexState = next;
      document.errorMessage = null;
      document.updatedAt = nowIso();
      return ok(document);
    },
    async setIndexState(id: string, state: KnowledgeIndexState, errorMessage?: string): Promise<Result<KnowledgeDocument>> {
      const document = find(id);
      if (!document) return err({ code: 'not_found', message: 'Document not found.' });
      document.indexState = state;
      document.errorMessage = state === 'failed' ? errorMessage ?? 'Indexing failed.' : null;
      document.updatedAt = nowIso();
      return ok(document);
    },
    async setActive(id: string, active: boolean): Promise<Result<KnowledgeDocument>> {
      const document = find(id);
      if (!document) return err({ code: 'not_found', message: 'Document not found.' });
      document.active = active;
      document.updatedAt = nowIso();
      return ok(document);
    },
    async archiveDoc(id: string): Promise<Result<KnowledgeDocument>> {
      if (isSupabaseAdminConfigured()) {
        const okd = await knowledgeRepo.archiveDocument(id);
        if (!okd) return err({ code: 'not_found', message: 'Document not found.' });
        const doc = await knowledgeRepo.getDocument(id);
        return doc ? ok(doc) : err({ code: 'not_found', message: 'Document not found.' });
      }
      const document = find(id);
      if (!document) return err({ code: 'not_found', message: 'Document not found.' });
      document.indexState = 'archived';
      document.active = false;
      document.publishStatus = 'archived';
      document.updatedAt = nowIso();
      return ok(document);
    },
    async assignSpecialist(id: string, slug: string): Promise<Result<KnowledgeDocument>> {
      const document = find(id);
      if (!document) return err({ code: 'not_found', message: 'Document not found.' });
      document.assignedSpecialistSlug = slug;
      document.updatedAt = nowIso();
      return ok(document);
    },

    /** Move a document through the publishing workflow. */
    async transition(id: string, to: PublishStatus): Promise<Result<KnowledgeDocument>> {
      const document = find(id);
      if (!document) return err({ code: 'not_found', message: 'Document not found.' });
      if (!canTransition(document.publishStatus, to)) {
        return err({ code: 'invalid', message: `Cannot move from ${document.publishStatus} to ${to}.` });
      }
      document.publishStatus = to;
      document.updatedAt = nowIso();
      if (to === 'published') {
        document.approvedBy = 'usr_admin';
        document.approvedAt = nowIso();
      }
      return ok(document);
    },
  },

  async stats(): Promise<Result<{ total: number; published: number; inReview: number; drafts: number; archived: number; categories: number; collections: number }>> {
    if (isSupabaseAdminConfigured()) {
      const s = await knowledgeRepo.documentStats();
      return ok({ ...s, categories: SEED_CATEGORIES.length, collections: collections.length });
    }
    return ok({
      total: documents.length,
      published: documents.filter((d) => d.publishStatus === 'published').length,
      inReview: documents.filter((d) => d.publishStatus === 'in_review').length,
      drafts: documents.filter((d) => d.publishStatus === 'draft').length,
      archived: documents.filter((d) => d.publishStatus === 'archived').length,
      categories: SEED_CATEGORIES.length,
      collections: collections.length,
    });
  },
};
