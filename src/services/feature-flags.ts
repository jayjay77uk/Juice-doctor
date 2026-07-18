import 'server-only';

import {
  FEATURE_FLAGS,
  ALL_FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
  type FeatureFlagDef,
} from '@/config/feature-flags';
import type { AppRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Feature-flag evaluation. The registry (config/feature-flags.ts) DEFINES the
 * flags; PRODUCTION persists each flag's live state in the feature_flags table
 * (org-scoped), so Configuration Centre toggles survive restarts/deploys and
 * apply across instances. An in-process cache keeps evaluation cheap; the
 * registry default is the fallback when the database is unavailable.
 */
export interface FlagContext {
  userId?: string;
  role?: AppRole;
  organisationId?: string | null;
}

const ORG = '00000000-0000-0000-0000-000000000001';

const cache = new Map<FeatureFlagKey, boolean>();
let loaded = false;

async function load(): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;
  try {
    const { data } = await sb.from('feature_flags').select('key, enabled').eq('organisation_id', ORG);
    for (const row of data ?? []) {
      const key = String(row.key);
      if ((ALL_FEATURE_FLAG_KEYS as string[]).includes(key)) cache.set(key as FeatureFlagKey, Boolean(row.enabled));
    }
    loaded = true;
  } catch {
    // registry defaults remain the fallback
  }
}

async function persist(key: FeatureFlagKey, enabled: boolean): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;
  try {
    const existing = await sb.from('feature_flags').select('id').eq('organisation_id', ORG).eq('key', key).maybeSingle();
    if (existing.data?.id) {
      await sb.from('feature_flags').update({ enabled, updated_at: new Date().toISOString() }).eq('id', existing.data.id);
    } else {
      await sb.from('feature_flags').insert({ organisation_id: ORG, key, description: FEATURE_FLAGS[key].description, enabled });
    }
  } catch {
    // cache holds the value for this instance; next toggle retries
  }
}

function resolve(key: FeatureFlagKey): boolean {
  return cache.get(key) ?? FEATURE_FLAGS[key].defaultEnabled;
}

export const featureFlags = {
  async isEnabled(key: FeatureFlagKey, _ctx: FlagContext = {}): Promise<boolean> {
    if (!loaded) await load();
    return resolve(key);
  },
  async all(): Promise<(FeatureFlagDef & { enabled: boolean; overridden: boolean })[]> {
    if (!loaded) await load();
    return ALL_FEATURE_FLAG_KEYS.map((k) => ({
      ...FEATURE_FLAGS[k],
      enabled: resolve(k),
      overridden: cache.has(k),
    }));
  },
  async toggle(key: FeatureFlagKey): Promise<boolean> {
    if (!loaded) await load();
    const next = !resolve(key);
    cache.set(key, next);
    await persist(key, next);
    return next;
  },
  isValidKey(key: string): key is FeatureFlagKey {
    return (ALL_FEATURE_FLAG_KEYS as string[]).includes(key);
  },
};
