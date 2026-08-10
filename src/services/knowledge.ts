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
import { ok, err, type Result, type Page } from './result';
import type { ListQuery } from './index';
import { knowledgeRepo } from './repositories/knowledge-repo';
import { getSession } from './auth';

/**
 * Knowledge base — documents, categories, collections and the publishing +
 * indexing workflow over the knowledge_* tables (migrations 0012 + 0018). All
 * operations are real rows; content ingestion happens via the upload action →
 * knowledgeRepo.ingestText. Indexing states are accurate pipeline states —
 * never called "training". No mock data.
 */

/** The publishing workflow state machine (shared with prompts + documents UI). */
export const PUBLISH_TRANSITIONS: Record<PublishStatus, PublishStatus[]> = {
  draft: ['in_review', 'archived'],
  in_review: ['approved', 'rejected', 'draft'],
  approved: ['published', 'in_review'],
  published: ['archived'],
  rejected: ['draft', 'archived'],
  archived: ['draft'],
};

export function canTransition(from: PublishStatus, to: PublishStatus): boolean {
  return PUBLISH_TRANSITIONS[from]?.includes(to) ?? false;
}

const INDEX_NEXT: Partial<Record<KnowledgeIndexState, KnowledgeIndexState>> = {
  uploaded: 'processing',
  processing: 'indexed',
  indexed: 'available',
};

function notFound<T>(): Result<T> {
  return err({ code: 'not_found', message: 'Document not found.' });
}

export const knowledge = {
  categories: {
    async list(): Promise<Result<KnowledgeCategory[]>> {
      return ok(await knowledgeRepo.categories());
    },
  },

  collections: {
    /** Real collections — counts and timestamps come from the rows, nothing invented. */
    async list(): Promise<Result<KnowledgeCollection[]>> {
      const rows = await knowledgeRepo.collections();
      return ok(
        rows.map((r) => ({
          id: r.id,
          organisationId: r.organisationId,
          slug: r.slug,
          name: r.name,
          description: r.description,
          documentCount: r.documentCount,
          status: (r.status as KnowledgeCollection['status']) ?? 'active',
          updatedAt: r.updatedAt,
        })),
      );
    },
  },

  documents: {
    /** Replace a document's content as a NEW version (history preserved). */
    async reingest(documentId: string, text: string, changeNote?: string | null): Promise<Result<{ version: number; chunks: number }>> {
      return knowledgeRepo.reingestText(documentId, { text, ...(changeNote ? { changeNote } : {}) });
    },

    async list(
      q: ListQuery & { status?: PublishStatus; categoryId?: string; specialistSlug?: string } = {},
    ): Promise<Result<Page<KnowledgeDocument>>> {
      let rows = await knowledgeRepo.listDocuments();
      if (q.status) rows = rows.filter((d) => d.publishStatus === q.status);
      if (q.categoryId) rows = rows.filter((d) => d.categoryId === q.categoryId);
      if (q.specialistSlug) rows = rows.filter((d) => d.assignedSpecialistSlug === q.specialistSlug);
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok({ items: rows, nextCursor: null });
    },
    /** All documents in a specialist AI's knowledge brain. */
    async forSpecialist(slug: string): Promise<Result<KnowledgeDocument[]>> {
      return ok(await knowledgeRepo.forSpecialistSlug(slug));
    },
    /** Documents that are live in a specialist's brain (active + available). */
    async availableForSpecialist(slug: string): Promise<Result<KnowledgeDocument[]>> {
      const rows = await knowledgeRepo.forSpecialistSlug(slug);
      return ok(rows.filter((d) => d.active && d.indexState === 'available'));
    },
    async byId(id: string): Promise<Result<KnowledgeDocument>> {
      const doc = await knowledgeRepo.getDocument(id);
      return doc ? ok(doc) : notFound();
    },
    async bySlug(slug: string): Promise<Result<KnowledgeDocument>> {
      const doc = await knowledgeRepo.getDocumentBySlug(slug);
      return doc ? ok(doc) : notFound();
    },
    async versions(id: string): Promise<Result<KnowledgeDocumentVersion[]>> {
      const rows = await knowledgeRepo.versions(id);
      return ok(
        rows.map((v) => ({
          id: v.id,
          documentId: v.documentId,
          version: v.version,
          title: v.title,
          content: v.content,
          storagePath: v.storagePath,
          changeNote: v.changeNote ?? '',
          createdBy: v.createdBy ?? '',
          createdAt: v.createdAt,
        })),
      );
    },

    /** Create a metadata-only document (real row; content via the upload action). */
    async create(input: {
      title: string;
      sourceType: KnowledgeSourceType;
      assignedSpecialistSlug: string;
      categoryId: string | null;
      description?: string;
    }): Promise<Result<KnowledgeDocument>> {
      if (!input.title.trim()) return err({ code: 'invalid', message: 'A title is required.' });
      const doc = await knowledgeRepo.createDocument(input);
      return doc ? ok(doc) : err({ code: 'invalid', message: 'Could not create the document.' });
    },

    /** Advance the indexing pipeline one accurate step (never "training"). */
    async advanceIndex(id: string): Promise<Result<KnowledgeDocument>> {
      const current = await knowledgeRepo.getDocument(id);
      if (!current) return notFound();
      const next = INDEX_NEXT[current.indexState];
      if (!next) return err({ code: 'invalid', message: `Cannot advance from '${current.indexState}'.` });
      const doc = await knowledgeRepo.setIndexState(id, next);
      return doc ? ok(doc) : notFound();
    },
    async setIndexState(id: string, state: KnowledgeIndexState): Promise<Result<KnowledgeDocument>> {
      const doc = await knowledgeRepo.setIndexState(id, state);
      return doc ? ok(doc) : notFound();
    },
    async setActive(id: string, active: boolean): Promise<Result<KnowledgeDocument>> {
      const doc = await knowledgeRepo.setActive(id, active);
      return doc ? ok(doc) : notFound();
    },
    async archiveDoc(id: string): Promise<Result<KnowledgeDocument>> {
      const done = await knowledgeRepo.archiveDocument(id);
      if (!done) return notFound();
      const doc = await knowledgeRepo.getDocument(id);
      return doc ? ok(doc) : notFound();
    },
    async assignSpecialist(id: string, slug: string): Promise<Result<KnowledgeDocument>> {
      const doc = await knowledgeRepo.assignSpecialist(id, slug);
      return doc ? ok(doc) : notFound();
    },

    /** Move a document through the publishing workflow (validated transition). */
    async transition(id: string, to: PublishStatus): Promise<Result<KnowledgeDocument>> {
      const current = await knowledgeRepo.getDocument(id);
      if (!current) return notFound();
      if (!canTransition(current.publishStatus, to)) {
        return err({ code: 'invalid', message: `Cannot move from ${current.publishStatus} to ${to}.` });
      }
      const session = await getSession();
      const doc = await knowledgeRepo.transition(id, to, session?.user.id ?? null);
      return doc ? ok(doc) : notFound();
    },
  },

  async stats(): Promise<Result<{ total: number; published: number; inReview: number; drafts: number; archived: number; categories: number; collections: number }>> {
    const [s, categories, collections] = await Promise.all([
      knowledgeRepo.documentStats(),
      knowledgeRepo.categories(),
      knowledgeRepo.collections(),
    ]);
    return ok({ ...s, categories: categories.length, collections: collections.length });
  },
};
