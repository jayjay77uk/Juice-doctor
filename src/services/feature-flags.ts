import 'server-only';

import {
  FEATURE_FLAGS,
  ALL_FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
  type FeatureFlagDef,
} from '@/config/feature-flags';
import type { AppRole } from '@/lib/auth/roles';

/**
 * Feature-flag evaluation. Prototype resolves the registry default; production
 * layers organisation → role → user overrides (feature_flag_overrides) on top.
 * The signature already accepts the targeting context so call sites never change.
 */
export interface FlagContext {
  userId?: string;
  role?: AppRole;
  organisationId?: string | null;
}

export const featureFlags = {
  async isEnabled(key: FeatureFlagKey, _ctx: FlagContext = {}): Promise<boolean> {
    // Production: check overrides for _ctx, most-specific wins; else default.
    return FEATURE_FLAGS[key].defaultEnabled;
  },
  async all(): Promise<(FeatureFlagDef & { enabled: boolean })[]> {
    return ALL_FEATURE_FLAG_KEYS.map((k) => ({ ...FEATURE_FLAGS[k], enabled: FEATURE_FLAGS[k].defaultEnabled }));
  },
};
