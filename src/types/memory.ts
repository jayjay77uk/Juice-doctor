/**
 * Memory model — mirrors migration 0011. Six cleanly-separated scopes share one
 * record shape; the scope discriminator + nullable keys identify each, and RLS
 * isolates them. See docs/architecture/07-memory.md.
 */

export type MemoryScope =
  | 'session'
  | 'user'
  | 'conversation'
  | 'agent'
  | 'organisation'
  | 'global';

export type MemoryKind = 'fact' | 'summary' | 'preference' | 'instruction' | 'embedding_ref';

export interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  organisationId: string | null;
  userId: string | null;
  agentId: string | null;
  conversationId: string | null;
  sessionId: string | null;
  kind: MemoryKind;
  memoryKey: string;
  content: string | null;
  data: Record<string, unknown>;
  importance: number;
  source: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Identifies the owner of a scope for reads/writes. */
export type MemorySelector =
  | { scope: 'session'; sessionId: string; userId: string }
  | { scope: 'user'; userId: string }
  | { scope: 'conversation'; conversationId: string }
  | { scope: 'agent'; agentId: string; organisationId: string }
  | { scope: 'organisation'; organisationId: string }
  | { scope: 'global' };

export interface MemoryWrite {
  kind: MemoryKind;
  memoryKey: string;
  content?: string;
  data?: Record<string, unknown>;
  importance?: number;
  source?: string;
  expiresAt?: string;
}
