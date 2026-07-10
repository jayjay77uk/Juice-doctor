import 'server-only';

import {
  FEATURE_FLAGS,
  ALL_FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
  type FeatureFlagDef,
} from '@/config/feature-flags';
import type { AppRole } from '@/lib/auth/roles';

/**
 * Feature-flag evaluation. Prototype resolves the registry default plus an
 * in-process override (so the Configuration Centre can toggle flags live);
 * production layers organisation → role → user overrides
 * (feature_flag_overrides) on top. The signature already accepts the targeting
 * context so call sites never change.
 */
export interface FlagContext {
  userId?: string;
  role?: AppRole;
  organisationId?: string | null;
}

// Prototype-only override store (production: feature_flag_overrides table).
const overrides = new Map<FeatureFlagKey, boolean>();

function resolve(key: FeatureFlagKey): boolean {
  return overrides.get(key) ?? FEATURE_FLAGS[key].defaultEnabled;
}

export const featureFlags = {
  async isEnabled(key: FeatureFlagKey, _ctx: FlagContext = {}): Promise<boolean> {
    return resolve(key);
  },
  async all(): Promise<(FeatureFlagDef & { enabled: boolean; overridden: boolean })[]> {
    return ALL_FEATURE_FLAG_KEYS.map((k) => ({
      ...FEATURE_FLAGS[k],
      enabled: resolve(k),
      overridden: overrides.has(k),
    }));
  },
  async toggle(key: FeatureFlagKey): Promise<boolean> {
    const next = !resolve(key);
    overrides.set(key, next);
    return next;
  },
  isValidKey(key: string): key is FeatureFlagKey {
    return (ALL_FEATURE_FLAG_KEYS as string[]).includes(key);
  },
};
