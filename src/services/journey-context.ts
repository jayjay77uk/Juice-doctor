import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { ONBOARDING_GOALS } from '@/lib/onboarding';
import { hasConsent } from './consents';

export async function journeyContext(userId: string): Promise<string> {
  if (!(await hasConsent(userId, 'ai_processing'))) return '';
  const sb = createAdminClient();
  if (!sb) return '';
  const { data, error } = await sb.from('member_journeys').select('focus').eq('user_id', userId).maybeSingle();
  if (error) return '';
  const focus = ONBOARDING_GOALS.find(goal => goal.key === data?.focus);
  return focus ? `Member-selected current wellbeing focus: ${focus.label}. Treat this as a personal preference, not a clinical finding.` : '';
}
