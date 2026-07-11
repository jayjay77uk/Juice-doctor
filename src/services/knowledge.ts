import 'server-only';

import type {
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeDocumentVersion,
  PublishStatus,
} from '@/types/knowledge';
import type { KnowledgeCollection } from '@/types/ai-platform';
import { ok, err, type Page, type Result } from './result';
import type { ListQuery } from './index';

/**
 * Knowledge management — the portal read/write layer (no ingestion/embeddings).
 * The publishing/approval workflow is an explicit state machine shared by the
 * admin UI and API. Prototype uses in-process seed data; production reads the
 * knowledge_* tables (migrations 0012 + 0014). Documents, versions, categories,
 * collections, tags and stats are all data — nothing is hardcoded in the UI.
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

const ORG = '00000000-0000-0000-0000-000000000001';
const TS = '2026-07-10T00:00:00.000Z';

const SEED_CATEGORIES: KnowledgeCategory[] = [
  { id: 'cat_1', organisationId: ORG, parentId: null, slug: 'category-one', name: 'Category One', description: 'Core framework guidance.', sortOrder: 0, status: 'active' },
  { id: 'cat_2', organisationId: ORG, parentId: null, slug: 'category-two', name: 'Category Two', description: null, sortOrder: 1, status: 'active' },
  { id: 'cat_3', organisationId: ORG, parentId: null, slug: 'category-three', name: 'Category Three', description: null, sortOrder: 2, status: 'active' },
  { id: 'cat_4', organisationId: ORG, parentId: null, slug: 'category-four', name: 'Category Four', description: 'Onboarding + triage material.', sortOrder: 3, status: 'active' },
];

function doc(partial: Partial<KnowledgeDocument> & Pick<KnowledgeDocument, 'id' | 'title' | 'slug' | 'sourceType' | 'publishStatus' | 'categoryId'>): KnowledgeDocument {
  return {
    organisationId: ORG,
    description: null,
    sourceUri: null,
    currentVersion: 1,
    // Retrieval readiness: published docs are 'available', others 'uploaded'.
    indexState: partial.publishStatus === 'published' ? 'available' : 'uploaded',
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
  doc({ id: 'doc_1', title: 'The Framework — Overview', slug: 'document-one', sourceType: 'markdown', publishStatus: 'published', categoryId: 'cat_1', description: 'The definitive overview of the five-pillar framework.', tags: ['framework', 'foundations'], visibility: 'public' }),
  doc({ id: 'doc_2', title: 'Getting Started Guide', slug: 'document-two', sourceType: 'pdf', publishStatus: 'published', categoryId: 'cat_3', description: 'A concise introduction to the basics.', tags: ['guide', 'basics'] }),
  doc({ id: 'doc_3', title: 'Product Overview', slug: 'document-three', sourceType: 'docx', publishStatus: 'in_review', categoryId: 'cat_2', description: 'A sustainable approach to the fundamentals.', tags: ['overview'] }),
  doc({ id: 'doc_4', title: 'Reference Guide', slug: 'document-four', sourceType: 'pdf', publishStatus: 'approved', categoryId: 'cat_1', tags: ['reference', 'guide'] }),
  doc({ id: 'doc_5', title: 'Intake Questionnaire Reference', slug: 'document-five', sourceType: 'csv', publishStatus: 'draft', categoryId: 'cat_4', description: 'Reference answers for the intake flow.', visibility: 'private' }),
  doc({ id: 'doc_6', title: 'Product FAQ', slug: 'document-six', sourceType: 'txt', publishStatus: 'archived', categoryId: 'cat_2', tags: ['faq', 'habits'] }),
];

const collections: KnowledgeCollection[] = [
  { id: 'col_companion', organisationId: ORG, slug: 'companion-reading', name: 'Assistant Reading List', description: 'Sources the member assistant may cite.', documentCount: 3, status: 'active', updatedAt: TS },
  { id: 'col_clinical', organisationId: ORG, slug: 'clinical-guidance', name: 'Practitioner Guidance', description: 'Practitioner-only references.', documentCount: 2, status: 'active', updatedAt: TS },
];

function nowIso() {
  return new Date().toISOString();
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
    async list(q: ListQuery & { status?: PublishStatus; categoryId?: string } = {}): Promise<Result<Page<KnowledgeDocument>>> {
      let rows = [...documents];
      if (q.status) rows = rows.filter((d) => d.publishStatus === q.status);
      if (q.categoryId) rows = rows.filter((d) => d.categoryId === q.categoryId);
      return ok({ items: rows, nextCursor: null });
    },
    async byId(id: string): Promise<Result<KnowledgeDocument>> {
      const match = documents.find((d) => d.id === id);
      return match ? ok(match) : err({ code: 'not_found', message: 'Document not found.' });
    },
    async bySlug(slug: string): Promise<Result<KnowledgeDocument>> {
      const match = documents.find((d) => d.slug === slug);
      return match ? ok(match) : err({ code: 'not_found', message: `No knowledge document '${slug}'.` });
    },
    async versions(id: string): Promise<Result<KnowledgeDocumentVersion[]>> {
      const document = documents.find((d) => d.id === id);
      if (!document) return err({ code: 'not_found', message: 'Document not found.' });
      return ok([
        { id: `${id}_v1`, documentId: id, version: 1, title: document.title, content: null, storagePath: document.sourceUri, changeNote: 'Initial import', createdBy: document.ownerId, createdAt: TS },
      ]);
    },
    /** Move a document through the publishing workflow. */
    async transition(id: string, to: PublishStatus): Promise<Result<KnowledgeDocument>> {
      const document = documents.find((d) => d.id === id);
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
