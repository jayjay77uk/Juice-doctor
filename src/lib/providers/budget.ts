import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { providerPolicy, type FreeProvider, FREE_PROVIDERS } from './policy';

/** Reserve BEFORE dispatch, across all server instances. Failed/ambiguous calls stay charged
 * against the allowance; this intentionally favours underspending over an accidental retry. */
export async function reserveProviderUsage(provider: FreeProvider, units = 1): Promise<boolean> {
  const policy = providerPolicy(provider);
  if (!policy.allowed || !Number.isSafeInteger(units) || units <= 0) return false;
  const sb = createAdminClient();
  if (!sb) return false;
  try {
    const { data, error } = await sb.rpc('reserve_free_provider_usage', {
      p_provider: provider, p_units: units, p_day_limit: policy.day, p_month_limit: policy.month,
    });
    return !error && data === true;
  } catch { return false; }
}

export async function providerBudgetStatus() {
  const sb = createAdminClient();
  const month = new Date().toISOString().slice(0, 7);
  const result = sb ? await sb.from('provider_usage_budgets').select('provider, units').in('period', [month, 'trial']) : null;
  return FREE_PROVIDERS.map(provider => {
    const policy = providerPolicy(provider);
    const used = result && !result.error ? Number(result.data?.find(r => r.provider === provider)?.units ?? 0) : null;
    return { provider, ...policy, used, remaining: used === null ? null : Math.max(0, policy.month - used) };
  });
}

/** Free subscription and disabled overages are checked immediately before ElevenLabs synthesis. */
export async function verifyElevenLabsFreeAllowance(apiKey: string, characters: number): Promise<boolean> {
  if (!providerPolicy('elevenlabs').allowed) return false;
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey }, signal: AbortSignal.timeout(10_000), cache: 'no-store',
    });
    if (!r.ok) return false;
    const v = await r.json();
    return v.tier === 'free' && v.can_extend_character_limit !== true &&
      (v.max_credit_limit_extension === 0 || v.max_character_limit_extension === 0) &&
      Number.isFinite(v.character_count) && Number.isFinite(v.character_limit) &&
      v.character_limit <= 10_000 && v.character_limit - v.character_count >= characters;
  } catch { return false; }
}
