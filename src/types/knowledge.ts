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
  | 'image'
  | 'audio'
  | 'video'
  | 'audio_transcript';

/** The upload kinds offered in the admin, mapped to a source type + label. */
// Only values of the DB enum knowledge_source_type — anything else fails the
// insert (image/audio/video are not in the enum and were removed).
export const KNOWLEDGE_UPLOAD_KINDS: { value: KnowledgeSourceType; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word document' },
  { value: 'txt', label: 'Text file' },
  { value: 'csv', label: 'Spreadsheet (CSV)' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'url', label: 'Website content' },
  { value: 'manual', label: 'Structured notes' },
  { value: 'audio_transcript', label: 'Audio transcript' },
];

export type KnowledgeVisibility = 'private' | 'organisation' | 'public';
export type KnowledgeAccess = 'read' | 'edit' | 'approve';

/**
 * Retrieval-readiness of a document in an AI's knowledge brain — DISTINCT from
 * the editorial `publishStatus`. A document is never "trained"; it moves through
 * these accurate states as it is ingested for retrieval.
 */
export type KnowledgeIndexState =
  | 'uploaded'
  | 'processing'
  | 'indexed'
  | 'available'
  | 'failed'
  | 'archived';

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
  /** The specialist AI whose knowledge brain this document belongs to. */
  assignedSpecialistSlug: string | null;
  title: string;
  slug: string;
  description: string | null;
  sourceType: KnowledgeSourceType;
  sourceUri: string | null;
  currentVersion: number;
  /** Editorial workflow state. */
  publishStatus: PublishStatus;
  /** Retrieval-readiness state (uploaded → processing → indexed → available). */
  indexState: KnowledgeIndexState;
  /** Whether this document is active in the brain (vs. temporarily disabled). */
  active: boolean;
  /** Set when indexState is 'failed'. */
  errorMessage: string | null;
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
