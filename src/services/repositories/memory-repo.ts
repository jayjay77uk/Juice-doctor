import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Memory repository over ai_memory. Layers: user memory (persists across a
 * customer's specialists) and conversation memory (scoped to one thread). Writes
 * are best-effort and de-duplicated by (scope, user, agent, key). Ids that are
 * not real UUIDs (legacy mock ids) are stored as null so nothing crashes.
 */

const ORG = '00000000-0000-0000-0000-000000000001';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidOrNull(v: unknown): string | null {
  return typeof v === 'string' && UUID_RE.test(v) ? v : null;
}

export interface MemoryItem {
  kind: string;
  content: string;
  importance: number;
}

export interface RememberInput {
  scope: 'session' | 'user' | 'conversation' | 'agent' | 'organisation' | 'global';
  kind: 'fact' | 'summary' | 'preference' | 'instruction';
  key: string;
  content: string;
  userId?: string | null;
  agentId?: string | null;
  conversationId?: string | null;
  importance?: number;
  source?: string;
}

export const memoryRepo = {
  async remember(input: RememberInput): Promise<void> {
    const sb = createAdminClient();
    if (!sb || !input.content.trim()) return;
    const userId = uuidOrNull(input.userId);
    const agentId = uuidOrNull(input.agentId);
    const conversationId = uuidOrNull(input.conversationId);
    try {
      let sel = sb.from('ai_memory').select('id').eq('scope', input.scope).eq('memory_key', input.key);
      sel = userId ? sel.eq('user_id', userId) : sel.is('user_id', null);
      const existing = await sel.maybeSingle();
      if (existing.data) {
        await sb
          .from('ai_memory')
          .update({ content: input.content, importance: input.importance ?? 1, updated_at: new Date().toISOString() })
          .eq('id', existing.data.id);
        return;
      }
      await sb.from('ai_memory').insert({
        organisation_id: ORG,
        scope: input.scope,
        user_id: userId,
        agent_id: agentId,
        conversation_id: conversationId,
        kind: input.kind,
        memory_key: input.key,
        content: input.content,
        data: {},
        importance: input.importance ?? 1,
        source: input.source ?? 'system',
      });
    } catch {
      // best-effort
    }
  },

  /** Recall memory relevant to a customer + optional conversation, most important first. */
  async recall(input: { userId?: string | null; conversationId?: string | null; limit?: number }): Promise<MemoryItem[]> {
    const sb = createAdminClient();
    const userId = uuidOrNull(input.userId);
    const conversationId = uuidOrNull(input.conversationId);
    if (!sb || (!userId && !conversationId)) return [];
    const items: MemoryItem[] = [];
    const map = (rows: Record<string, unknown>[]) =>
      rows
        .filter((r) => typeof r.content === 'string' && r.content)
        .map((r) => ({ kind: String(r.kind), content: String(r.content), importance: Number(r.importance) || 1 }));

    if (userId) {
      const { data } = await sb
        .from('ai_memory')
        .select('kind, content, importance')
        .eq('user_id', userId)
        .order('importance', { ascending: false })
        .limit(input.limit ?? 8);
      items.push(...map(data ?? []));
    }
    if (conversationId) {
      const { data } = await sb
        .from('ai_memory')
        .select('kind, content, importance')
        .eq('conversation_id', conversationId)
        .order('importance', { ascending: false })
        .limit(input.limit ?? 8);
      items.push(...map(data ?? []));
    }
    // de-dup by content
    const seen = new Set<string>();
    return items.filter((i) => (seen.has(i.content) ? false : (seen.add(i.content), true))).slice(0, input.limit ?? 8);
  },

  /** List a person's own stored memories (for the memory-management UI). */
  async listForUser(userId: string): Promise<{ id: string; kind: string; content: string; source: string; createdAt: string }[]> {
    const sb = createAdminClient();
    const uid = uuidOrNull(userId);
    if (!sb || !uid) return [];
    const { data } = await sb
      .from('ai_memory')
      .select('id, kind, content, source, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(100);
    return (data ?? []).map((r) => ({ id: String(r.id), kind: String(r.kind), content: String(r.content), source: String(r.source ?? 'system'), createdAt: String(r.created_at) }));
  },

  /** Delete one of a person's own memories (ownership enforced by the user filter). */
  async forget(userId: string, id: string): Promise<boolean> {
    const sb = createAdminClient();
    const uid = uuidOrNull(userId);
    const mid = uuidOrNull(id);
    if (!sb || !uid || !mid) return false;
    const { error } = await sb.from('ai_memory').delete().eq('id', mid).eq('user_id', uid);
    return !error;
  },

  /** Delete ALL of a person's memories (disable/clear memory). */
  async forgetAll(userId: string): Promise<number> {
    const sb = createAdminClient();
    const uid = uuidOrNull(userId);
    if (!sb || !uid) return 0;
    const { data } = await sb.from('ai_memory').delete().eq('user_id', uid).select('id');
    return (data ?? []).length;
  },
};

/** Heuristic: does this user message state a durable preference/fact worth remembering? */
export function extractMemory(userText: string): { kind: 'preference' | 'fact'; content: string } | null {
  const t = userText.trim();
  if (t.length < 6) return null;
  if (/\b(i (prefer|like|love|hate|avoid|can'?t eat|am|'m)|my goal|i want to|allerg|vegetarian|vegan|gluten|diabet|lactose|pregnan)\b/i.test(t)) {
    return { kind: /\b(prefer|like|love|hate|goal|want)\b/i.test(t) ? 'preference' : 'fact', content: t.slice(0, 200) };
  }
  return null;
}
