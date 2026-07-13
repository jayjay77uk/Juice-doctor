import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/services/auth';
import {
  resolveLanguagePreference,
  HERNE_DEFAULT_PREFERENCE,
  type LanguagePreference,
  type StoredLanguagePreference,
} from './language';

/**
 * Persistence for a person's language & voice preference. Stored on the existing
 * `user_preferences` row — under the extensible `preferences` jsonb (key
 * `herne_language`), with the profile-level `locale` column as a fallback. No new
 * table or migration: this reuses the platform's real preference model, and RLS on
 * `user_preferences` already scopes every row to its owner.
 */

const KEY = 'herne_language';

/** Read the current signed-in person's preference (RLS-scoped). Default in preview. */
export async function getLanguagePreference(): Promise<LanguagePreference> {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) return { ...HERNE_DEFAULT_PREFERENCE };
  const sb = await createSupabaseServerClient();
  if (!sb) return { ...HERNE_DEFAULT_PREFERENCE };
  const { data } = await sb.from('user_preferences').select('locale, preferences').eq('user_id', userId).maybeSingle();
  return fromRow(data);
}

/**
 * Read a specific person's preference by id (admin client, explicit user filter) —
 * used by the orchestration/reply path so a specialist can answer a signed-in
 * person in their saved language without threading it through every request.
 */
export async function getLanguagePreferenceFor(userId: string | null | undefined): Promise<LanguagePreference> {
  if (!userId) return { ...HERNE_DEFAULT_PREFERENCE };
  const sb = createAdminClient();
  if (!sb) return { ...HERNE_DEFAULT_PREFERENCE };
  const { data } = await sb.from('user_preferences').select('locale, preferences').eq('user_id', userId).maybeSingle();
  return fromRow(data);
}

function fromRow(data: { locale?: string | null; preferences?: unknown } | null): LanguagePreference {
  const prefs = (data?.preferences ?? null) as Record<string, unknown> | null;
  const stored = prefs?.[KEY] as StoredLanguagePreference | undefined;
  if (stored) return resolveLanguagePreference(stored);
  return resolveLanguagePreference(data?.locale ? { language: data.locale } : null);
}

/** Persist the signed-in person's preference. Returns the saved (validated) value. */
export async function saveLanguagePreference(input: StoredLanguagePreference): Promise<{ ok: boolean; preference: LanguagePreference; reason?: string }> {
  const pref = resolveLanguagePreference(input);
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) return { ok: false, preference: pref, reason: 'not_signed_in' };
  const sb = await createSupabaseServerClient();
  if (!sb) return { ok: false, preference: pref, reason: 'unavailable' };

  // Merge into any existing preferences jsonb so we never clobber other keys.
  const { data: existing } = await sb.from('user_preferences').select('preferences').eq('user_id', userId).maybeSingle();
  const merged = { ...((existing?.preferences as Record<string, unknown> | null) ?? {}), [KEY]: pref };

  const { error } = await sb
    .from('user_preferences')
    .upsert({ user_id: userId, locale: pref.language, preferences: merged }, { onConflict: 'user_id' });
  if (error) return { ok: false, preference: pref, reason: error.message };
  return { ok: true, preference: pref };
}
