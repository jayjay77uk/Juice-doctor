/**
 * Feature-flag registry.
 *
 * Unlike Phase 1 (where "coming soon" was a hardcoded-false constant), Phase 2
 * introduces real flags with two live values, targeting, and an admin surface —
 * so this registry now earns its keep. Each flag has a default; production layers
 * per-organisation, per-role and per-user overrides on top (see feature_flags +
 * feature_flag_overrides tables, migration 0013).
 */

export interface FeatureFlagDef {
  key: string;
  description: string;
  /** Default state when no override applies. */
  defaultEnabled: boolean;
  /** Grouping for the admin UI. */
  category: 'ai' | 'platform' | 'commerce' | 'experimental';
}

export const FEATURE_FLAGS = {
  'ai.chat': {
    key: 'ai.chat',
    description: 'The AI chat experience (specialist chat is live today; flag reserved for future gating).',
    defaultEnabled: false,
    category: 'ai',
  },
  'ai.selfie_scan_inference': {
    key: 'ai.selfie_scan_inference',
    description: 'Real inference for the Remote Selfie Scan (today the scan is an on-device demonstration only).',
    defaultEnabled: false,
    category: 'ai',
  },
  'knowledge.vector_search': {
    key: 'knowledge.vector_search',
    description: 'Vector search over the knowledge base (needs pgvector).',
    defaultEnabled: false,
    category: 'ai',
  },
  'commerce.checkout': {
    key: 'commerce.checkout',
    description: 'Live payments and checkout.',
    defaultEnabled: false,
    category: 'commerce',
  },
  'platform.live_booking': {
    key: 'platform.live_booking',
    description: 'Real-time availability calendars (basic appointment booking is already live).',
    defaultEnabled: false,
    category: 'platform',
  },
  'platform.notifications': {
    key: 'platform.notifications',
    description: 'Outbound notifications (email/SMS/push).',
    defaultEnabled: false,
    category: 'platform',
  },
} as const satisfies Record<string, FeatureFlagDef>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export const ALL_FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];
