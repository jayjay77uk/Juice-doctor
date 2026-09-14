/** Fixed spending policy. No runtime/admin setting can make a paid provider eligible. */
export const FREE_PROVIDERS = ['deepgram', 'elevenlabs', 'resend', 'posthog', 'sentry'] as const;
export type FreeProvider = (typeof FREE_PROVIDERS)[number];
const CEILINGS: Record<FreeProvider, { month: number; day: number; unit: string }> = {
  deepgram: { month: 100, day: 10, unit: 'requests' },
  elevenlabs: { month: 10_000, day: 2_000, unit: 'characters' },
  resend: { month: 3_000, day: 100, unit: 'emails' },
  posthog: { month: 1_000_000, day: 30_000, unit: 'events' },
  sentry: { month: 5_000, day: 150, unit: 'events' },
};
export function providerPolicy(provider: string, vars: Record<string, string | undefined> = process.env) {
  if (provider === 'anthropic') return { allowed: true, reason: 'Claude is the sole paid exception.', tier: 'paid exception', month: 0, day: 0, unit: 'tokens' };
  if (!FREE_PROVIDERS.includes(provider as FreeProvider)) return { allowed: false, reason: 'Provider is not allowlisted.', tier: 'disabled', month: 0, day: 0, unit: 'requests' };
  const key = `FREE_${provider.toUpperCase()}`;
  const ceiling = CEILINGS[provider as FreeProvider];
  const tier = vars[`${key}_TIER`] ?? 'unverified';
  const expires = Date.parse(vars[`${key}_VERIFIED_UNTIL`] ?? '');
  const validTier = tier === 'free' || (provider === 'deepgram' && tier === 'trial');
  const confirmed = vars[`${key}_HARD_CAP_CONFIRMED`] === 'true';
  const fresh = Number.isFinite(expires) && expires > Date.now() && expires <= Date.now() + 32 * 86400_000;
  const declared = Number(vars[`${key}_MONTHLY_LIMIT`] ?? ceiling.month);
  const month = Number.isSafeInteger(declared) && declared > 0 ? Math.min(declared, ceiling.month) : 0;
  const allowed = validTier && confirmed && fresh && month > 0;
  return { allowed, tier, month, day: Math.min(month, ceiling.day), unit: ceiling.unit,
    reason: allowed ? 'Free allowance; provider billing cap confirmed by account owner.' : 'Blocked until free tier, provider hard cap and current verification are recorded.' };
}
