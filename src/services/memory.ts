import 'server-only';

import type { MemoryRecord, MemorySelector, MemoryWrite } from '@/types/memory';
import { ok, type Result } from './result';

/**
 * Memory service — one uniform read/write API across all six scopes. The scope
 * and its keys come from a discriminated `MemorySelector`, so callers cannot mix
 * scopes by accident. Prototype uses a non-persistent in-memory store to exercise
 * the interface; production reads/writes the `ai_memory` table where RLS isolates
 * each scope (migration 0011).
 */

const store: MemoryRecord[] = [];
const SEED_TS = '2026-07-10T00:00:00.000Z';
let counter = 0;

type ScopeKeys = Pick<
  MemoryRecord,
  'scope' | 'organisationId' | 'userId' | 'agentId' | 'conversationId' | 'sessionId'
>;

function keysFromSelector(sel: MemorySelector): ScopeKeys {
  const base: ScopeKeys = {
    scope: sel.scope,
    organisationId: null,
    userId: null,
    agentId: null,
    conversationId: null,
    sessionId: null,
  };
  switch (sel.scope) {
    case 'session':
      return { ...base, sessionId: sel.sessionId, userId: sel.userId };
    case 'user':
      return { ...base, userId: sel.userId };
    case 'conversation':
      return { ...base, conversationId: sel.conversationId };
    case 'agent':
      return { ...base, agentId: sel.agentId, organisationId: sel.organisationId };
    case 'organisation':
      return { ...base, organisationId: sel.organisationId };
    case 'global':
      return base;
  }
}

function matches(rec: MemoryRecord, keys: ScopeKeys): boolean {
  return (
    rec.scope === keys.scope &&
    rec.userId === keys.userId &&
    rec.agentId === keys.agentId &&
    rec.conversationId === keys.conversationId &&
    rec.sessionId === keys.sessionId &&
    rec.organisationId === keys.organisationId
  );
}

export const memory = {
  async list(selector: MemorySelector): Promise<Result<MemoryRecord[]>> {
    const keys = keysFromSelector(selector);
    return ok(store.filter((r) => matches(r, keys)));
  },

  async read(selector: MemorySelector, memoryKey: string): Promise<Result<MemoryRecord | null>> {
    const keys = keysFromSelector(selector);
    return ok(store.find((r) => matches(r, keys) && r.memoryKey === memoryKey) ?? null);
  },

  async write(selector: MemorySelector, write: MemoryWrite): Promise<Result<MemoryRecord>> {
    const keys = keysFromSelector(selector);
    const record: MemoryRecord = {
      id: `mem_${++counter}`,
      ...keys,
      kind: write.kind,
      memoryKey: write.memoryKey,
      content: write.content ?? null,
      data: write.data ?? {},
      importance: write.importance ?? 0,
      source: write.source ?? null,
      expiresAt: write.expiresAt ?? null,
      createdAt: SEED_TS,
      updatedAt: SEED_TS,
    };
    const existing = store.findIndex((r) => matches(r, keys) && r.memoryKey === write.memoryKey);
    if (existing >= 0) store[existing] = record;
    else store.push(record);
    return ok(record);
  },
};
