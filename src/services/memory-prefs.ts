import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/services/auth';

/**
 * Memory consent — whether the platform may remember durable preferences/facts a
 * person states. Stored on user_preferences.preferences.memory_enabled (default
 * TRUE, matching current behaviour). A person can disable memory at any time; the
 * reply paths check this before writing, so nothing new is stored once disabled.
 */

const KEY = 'memory_enabled';

/** Admin-side read (used by the reply path for a specific user). Defaults to true. */
export async function isMemoryEnabled(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const sb = createAdminClient();
  if (!sb) return true;
  const { data } = await sb.from('user_preferences').select('preferences').eq('user_id', userId).maybeSingle();
  const prefs = (data?.preferences ?? null) as Record<string, unknown> | null;
  return prefs?.[KEY] === false ? false : true;
}

/** Read the signed-in person's memory setting. */
export async function getMemoryEnabled(): Promise<boolean> {
  const session = await getSession();
  return isMemoryEnabled(session?.user.id);
}

/** Persist the signed-in person's memory setting (merges the preferences jsonb). */
export async function setMemoryEnabled(enabled: boolean): Promise<boolean> {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) return false;
  const sb = await createSupabaseServerClient();
  if (!sb) return false;
  const { data: existing } = await sb.from('user_preferences').select('preferences').eq('user_id', userId).maybeSingle();
  const merged = { ...((existing?.preferences as Record<string, unknown> | null) ?? {}), [KEY]: enabled };
  const { error } = await sb.from('user_preferences').upsert({ user_id: userId, preferences: merged }, { onConflict: 'user_id' });
  return !error;
}
