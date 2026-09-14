import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Memory repository over ai_memory. Layers: user memory (persists across a
 * customer's specialists) and conversation memory (scoped to one thread). Writes
 * are best-effort and de-duplicated by (scope, user, agent, key). Ids that are
 * not real UUIDs (legacy ids from the pre-production build) are stored as null
 * so nothing crashes.
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

export interface AdminMemoryItem {
  id: string;
  scope: string;
  kind: string;
  key: string;
  content: string;
  source: string;
  importance: number;
  userId: string | null;
  memberName: string | null;
  memberEmail: string | null;
  conversationId: string | null;
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
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
      sel = conversationId ? sel.eq('conversation_id', conversationId) : sel.is('conversation_id', null);
      sel = agentId ? sel.eq('agent_id', agentId) : sel.is('agent_id', null);
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
  async recall(input: { userId?: string | null; conversationId?: string | null; organisationId?: string; config?: import('@/types/ai').AgentMemoryConfig; limit?: number }): Promise<MemoryItem[]> {
    const sb = createAdminClient();
    if (!sb || input.limit === 0) return [];
    const uid = uuidOrNull(input.userId), cid = uuidOrNull(input.conversationId);
    const cfg = input.config ?? { useUserMemory: true, useConversationMemory: true, useOrganisationMemory: false, useGlobalMemory: false };
    const queries = [];
    const base = () => sb.from('ai_memory').select('kind, content, importance').or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('importance', { ascending: false }).limit(Math.min(input.limit ?? 8, 20));
    if (uid && cfg.useUserMemory) queries.push(base().eq('scope', 'user').eq('user_id', uid));
    if (uid && cid && cfg.useConversationMemory) {
      const owner = await sb.from('conversations').select('id').eq('id', cid).eq('user_id', uid).maybeSingle();
      if (owner.data) queries.push(base().eq('scope', 'conversation').eq('conversation_id', cid).eq('user_id', uid));
    }
    if (input.organisationId && cfg.useOrganisationMemory) queries.push(base().eq('scope', 'organisation').eq('organisation_id', input.organisationId).is('user_id', null));
    if (cfg.useGlobalMemory) queries.push(base().eq('scope', 'global').is('organisation_id', null).is('user_id', null));
    const results = await Promise.all(queries);
    const seen = new Set<string>();
    return results.flatMap(r => r.error ? [] : r.data ?? []).filter(r => typeof r.content === 'string' && r.content && !seen.has(r.content) && seen.add(r.content))
      .map(r => ({ kind: String(r.kind), content: String(r.content).slice(0, 1000), importance: Number(r.importance) || 1 }))
      .sort((a,b) => b.importance - a.importance).slice(0, input.limit ?? 8);
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

  /**
   * Privacy-sensitive admin view. Callers MUST be administrator-gated and audit
   * the access. The repository returns only memory metadata/content needed for
   * governance — never hidden auth/session data.
   */
  async adminList(limit = 100): Promise<AdminMemoryItem[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from('ai_memory')
      .select('id, scope, kind, memory_key, content, source, importance, user_id, conversation_id, agent_id, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 250));
    if (error) return [];
    const rows = data ?? [];
    const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => typeof id === 'string'))];
    const profileMap = new Map<string, { name: string | null; email: string | null }>();
    if (userIds.length) {
      const { data: profiles } = await sb.from('profiles').select('id, full_name, display_name, email').in('id', userIds);
      for (const p of profiles ?? []) {
        profileMap.set(String(p.id), {
          name: (p.display_name as string | null) ?? (p.full_name as string | null) ?? null,
          email: (p.email as string | null) ?? null,
        });
      }
    }
    return rows.map((r) => {
      const uid = (r.user_id as string | null) ?? null;
      const profile = uid ? profileMap.get(uid) : undefined;
      return {
        id: String(r.id),
        scope: String(r.scope),
        kind: String(r.kind),
        key: String(r.memory_key),
        content: String(r.content ?? ''),
        source: String(r.source ?? 'system'),
        importance: Number(r.importance ?? 0),
        userId: uid,
        memberName: profile?.name ?? null,
        memberEmail: profile?.email ?? null,
        conversationId: (r.conversation_id as string | null) ?? null,
        agentId: (r.agent_id as string | null) ?? null,
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      };
    });
  },

  /** Administrator-only deletion target. Guard + audit live in the server action. */
  async adminForget(id: string): Promise<AdminMemoryItem | null> {
    const sb = createAdminClient();
    const mid = uuidOrNull(id);
    if (!sb || !mid) return null;
    const { data, error } = await sb
      .from('ai_memory')
      .delete()
      .eq('id', mid)
      .select('id, scope, kind, memory_key, content, source, importance, user_id, conversation_id, agent_id, created_at, updated_at')
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: String(data.id),
      scope: String(data.scope),
      kind: String(data.kind),
      key: String(data.memory_key),
      content: String(data.content ?? ''),
      source: String(data.source ?? 'system'),
      importance: Number(data.importance ?? 0),
      userId: (data.user_id as string | null) ?? null,
      memberName: null,
      memberEmail: null,
      conversationId: (data.conversation_id as string | null) ?? null,
      agentId: (data.agent_id as string | null) ?? null,
      createdAt: String(data.created_at),
      updatedAt: String(data.updated_at),
    };
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
