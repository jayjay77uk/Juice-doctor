/**
 * Knowledge management model — mirrors migration 0012. Architecture for the
 * document → version → chunk → embedding pipeline plus categories, tags,
 * a publishing/approval workflow, and permissions. Embeddings are placeholders
 * until pgvector is enabled (Phase 3).
 */

export type PublishStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived';

export type KnowledgeSourceType =
  | 'pdf'
  | 'docx'
  | 'txt'
  | 'csv'
  | 'markdown'
  | 'url'
  | 'manual'
  | 'ocr'
  | 'audio_transcript';

export type KnowledgeVisibility = 'private' | 'organisation' | 'public';
export type KnowledgeAccess = 'read' | 'edit' | 'approve';

export interface KnowledgeCategory {
  id: string;
  organisationId: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: 'draft' | 'active' | 'archived' | 'deleted';
}

export interface KnowledgeTag {
  id: string;
  organisationId: string;
  slug: string;
  name: string;
}

export interface KnowledgeDocument {
  id: string;
  organisationId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  description: string | null;
  sourceType: KnowledgeSourceType;
  sourceUri: string | null;
  currentVersion: number;
  publishStatus: PublishStatus;
  visibility: KnowledgeVisibility;
  ownerId: string;
  approvedBy: string | null;
  approvedAt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocumentVersion {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: string | null;
  storagePath: string | null;
  changeNote: string;
  createdBy: string;
  createdAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  version: number;
  chunkIndex: number;
  content: string;
  tokenCount: number | null;
  metadata: Record<string, unknown>;
}

/** Placeholder — the real `embedding vector(N)` column arrives with pgvector. */
export interface KnowledgeEmbedding {
  id: string;
  chunkId: string;
  modelKey: string;
  dimensions: number;
  vectorRef: string | null;
  createdAt: string;
}

export interface KnowledgeWorkflowEvent {
  id: string;
  documentId: string;
  fromStatus: PublishStatus | null;
  toStatus: PublishStatus;
  actorId: string | null;
  note: string | null;
  createdAt: string;
}
