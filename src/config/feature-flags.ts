/**
 * Feature-flag registry.
 *
 * Primary-organisation runtime controls. Reserved capabilities without a
 * connected implementation remain disabled. There is no per-user targeting.
 */

export interface FeatureFlagDef {
  key: string;
  description: string;
  /** Default state when no override applies. */
  defaultEnabled: boolean;
  /** Grouping for the admin UI. */
  category: 'ai' | 'platform' | 'commerce' | 'experimental';
  operable: boolean;
}

export const FEATURE_FLAGS = {
  'ai.chat': {
    key: 'ai.chat',
    description:
      'Allow receptionist and specialist AI inference. Safety responses remain available when disabled.',
    defaultEnabled: true,
    operable: true,
    category: 'ai',
  },
  'ai.selfie_scan_inference': {
    key: 'ai.selfie_scan_inference',
    operable: true,
    description: 'Real inference for the Remote Selfie Scan (the scan is not yet available today).',
    defaultEnabled: false,
    category: 'ai',
  },
  'knowledge.vector_search': {
    key: 'knowledge.vector_search',
    operable: false,
    description:
      'Unavailable: no vector retrieval provider is connected. Published knowledge uses full-text search.',
    defaultEnabled: false,
    category: 'ai',
  },
  'commerce.checkout': {
    key: 'commerce.checkout',
    operable: false,
    description:
      'Unavailable until a payment provider is selected and approved. Manual payment records remain available.',
    defaultEnabled: false,
    category: 'commerce',
  },
  'platform.live_booking': {
    key: 'platform.live_booking',
    operable: false,
    description:
      'Unavailable: no live availability provider is connected. Appointment requests remain available.',
    defaultEnabled: false,
    category: 'platform',
  },
  'platform.notifications': {
    key: 'platform.notifications',
    operable: true,
    description:
      'Enable email delivery and scheduled member follow-ups. Provider configuration and free-allowance checks still apply.',
    defaultEnabled: false,
    category: 'platform',
  },
} as const satisfies Record<string, FeatureFlagDef>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export const ALL_FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];
