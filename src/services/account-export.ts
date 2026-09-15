import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

const SOURCES = [
  ['profiles', 'id', 'id'],
  ['health_profiles', 'user_id', 'user_id'],
  ['fitness_profiles', 'user_id', 'user_id'],
  ['nutrition_profiles', 'user_id', 'user_id'],
  ['user_preferences', 'user_id', 'user_id'],
  ['goals', 'user_id', 'id'],
  ['conversations', 'user_id', 'id'],
  ['user_consents', 'user_id', 'id'],
  ['member_onboarding', 'user_id', 'user_id'],
  ['messages', 'conversations.user_id', 'id'],
] as const;

/** Never return a successful but partial export. All ownership predicates are
 * server-defined; messages are scoped through their parent conversation. */
export async function exportAccount(sb: SupabaseClient, userId: string) {
  const entries = await Promise.all(SOURCES.map(async ([table, owner, order]) => {
    const rows: Record<string, unknown>[] = [];
    let cursor: string | null = null;
    for (;;) {
      let query = sb.from(table)
        .select(table === 'messages' ? '*, conversations!inner(user_id)' : '*')
        .eq(owner, userId).order(order, { ascending: true }).limit(200);
      if (cursor !== null) query = query.gt(order, cursor);
      const { data, error } = await query;
      if (error || !data) throw new Error('Account export unavailable');
      if (!data.length) break;
      for (const row of data as unknown as Record<string, unknown>[]) {
        const copy = { ...row };
        if (table === 'messages') delete copy.conversations;
        rows.push(copy);
      }
      const next = String(rows.at(-1)?.[order]);
      if (next === cursor || next === 'undefined') throw new Error('Invalid export cursor');
      cursor = next;
    }
    return [table, rows] as const;
  }));
  return Object.fromEntries(entries);
}
