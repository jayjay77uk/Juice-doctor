import 'server-only';

import {
  FEATURE_FLAGS,
  ALL_FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
  type FeatureFlagDef,
} from '@/config/feature-flags';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Feature-flag evaluation. The registry (config/feature-flags.ts) DEFINES the
 * flags; PRODUCTION persists each flag's live state in the feature_flags table
 * (org-scoped), so Configuration Centre toggles survive restarts/deploys and
 * apply across instances. An in-process cache keeps evaluation cheap; the
 * registry default is the fallback when the database is unavailable.
 */
const ORG = '00000000-0000-0000-0000-000000000001';

const cache = new Map<FeatureFlagKey, boolean>();
let loadedAt = 0;
const CACHE_TTL_MS = 15_000;

async function load(): Promise<void> {
  const sb = createAdminClient();
  if (!sb) {
    cache.clear();
    for (const key of ALL_FEATURE_FLAG_KEYS) cache.set(key, false);
    loadedAt = 0;
    return;
  }
  try {
    const { data, error } = await sb
      .from('feature_flags')
      .select('key, enabled')
      .eq('organisation_id', ORG);
    if (error) throw error;
    cache.clear();
    for (const row of data ?? []) {
      const key = String(row.key);
      if ((ALL_FEATURE_FLAG_KEYS as string[]).includes(key))
        cache.set(key as FeatureFlagKey, Boolean(row.enabled));
    }
    loadedAt = Date.now();
  } catch {
    cache.clear();
    for (const key of ALL_FEATURE_FLAG_KEYS) cache.set(key, false);
    loadedAt = 0;
  }
}

async function persist(key: FeatureFlagKey, enabled: boolean): Promise<void> {
  const sb = createAdminClient();
  if (!sb) throw new Error('Feature flag storage unavailable.');
  const existing = await sb
    .from('feature_flags')
    .select('id')
    .eq('organisation_id', ORG)
    .eq('key', key)
    .maybeSingle();
  if (existing.error) throw new Error('Feature flag could not be read.');
  if (existing.data?.id) {
    const { data, error } = await sb
      .from('feature_flags')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', existing.data.id)
      .select('id')
      .single();
    if (error || !data) throw new Error('Feature flag could not be saved.');
  } else {
    const { error } = await sb
      .from('feature_flags')
      .insert({ organisation_id: ORG, key, description: FEATURE_FLAGS[key].description, enabled });
    if (error) throw new Error('Feature flag could not be saved.');
  }
}

function resolve(key: FeatureFlagKey): boolean {
  if (!FEATURE_FLAGS[key].operable) return false;
  return cache.get(key) ?? FEATURE_FLAGS[key].defaultEnabled;
}

export const featureFlags = {
  async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    if (Date.now() - loadedAt >= CACHE_TTL_MS) await load();
    return resolve(key);
  },
  async all(): Promise<(FeatureFlagDef & { enabled: boolean; overridden: boolean })[]> {
    if (Date.now() - loadedAt >= CACHE_TTL_MS) await load();
    return ALL_FEATURE_FLAG_KEYS.map((k) => ({
      ...FEATURE_FLAGS[k],
      enabled: resolve(k),
      overridden: cache.has(k),
    }));
  },
  async toggle(key: FeatureFlagKey): Promise<boolean> {
    if (!FEATURE_FLAGS[key].operable)
      throw new Error('This capability is not connected and cannot be enabled.');
    await load();
    const next = !resolve(key);
    await persist(key, next);
    cache.set(key, next);
    return next;
  },
  isValidKey(key: string): key is FeatureFlagKey {
    return (ALL_FEATURE_FLAG_KEYS as string[]).includes(key);
  },
};
