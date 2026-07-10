import 'server-only';

import type {
  KnowledgeCategory,
  KnowledgeDocument,
  PublishStatus,
} from '@/types/knowledge';
import { ok, err, type Page, type Result } from './result';
import type { ListQuery } from './index';

/**
 * Knowledge service — architecture + read layer (no ingestion/embeddings yet).
 * The publishing workflow is encoded as an explicit state machine so the admin
 * UI and API share one definition of which transitions are allowed and who may
 * make them. Prototype returns seed categories and no documents.
 */

/** Allowed transitions in the document publishing/approval workflow. */
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

const SEED_ORG = '00000000-0000-0000-0000-000000000001';
const SEED_CATEGORIES: KnowledgeCategory[] = [
  { id: 'cat_herne', organisationId: SEED_ORG, parentId: null, slug: 'herne-protocol', name: 'HERNE Protocol', description: 'Core protocol guidance.', sortOrder: 0, status: 'active' },
  { id: 'cat_nutrition', organisationId: SEED_ORG, parentId: null, slug: 'nutrition', name: 'Nutrition', description: null, sortOrder: 1, status: 'active' },
  { id: 'cat_hydration', organisationId: SEED_ORG, parentId: null, slug: 'hydration', name: 'Hydration', description: null, sortOrder: 2, status: 'active' },
  { id: 'cat_intake', organisationId: SEED_ORG, parentId: null, slug: 'intake', name: 'Intake', description: 'Onboarding + triage material.', sortOrder: 3, status: 'active' },
];

export const knowledge = {
  categories: {
    async list(): Promise<Result<KnowledgeCategory[]>> {
      return ok(SEED_CATEGORIES);
    },
  },
  documents: {
    async list(_q: ListQuery = {}): Promise<Result<Page<KnowledgeDocument>>> {
      // Prototype: no documents ingested yet. Production reads knowledge_documents.
      return ok({ items: [], nextCursor: null });
    },
    async bySlug(slug: string): Promise<Result<KnowledgeDocument>> {
      return err({ code: 'not_found', message: `No knowledge document '${slug}'.` });
    },
  },
};
