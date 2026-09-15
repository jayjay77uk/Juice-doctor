import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type ManagedConsent = 'ai_processing' | 'health_data_sharing';

export async function consentHistory(userId: string) {
  const sb = createAdminClient();
  if (!sb) throw new Error('Consent storage unavailable');
  const { data, error } = await sb.from('user_consents')
    .select('id, consent_type, granted, document_version, created_at')
    .eq('user_id', userId).in('consent_type', ['ai_processing', 'health_data_sharing'])
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100);
  if (error) throw new Error('Consent storage unavailable');
  return data ?? [];
}

/** Explicit ledger entries take precedence over legacy onboarding answers.
 * No record/failed read is never treated as permission to share health data. */
export async function hasConsent(userId: string, type: ManagedConsent): Promise<boolean> {
  const sb = createAdminClient();
  if (!sb) return false;
  const { data, error } = await sb.from('user_consents').select('granted')
    .eq('user_id', userId).eq('consent_type', type)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
  if (error) return false;
  if (data) return data.granted === true;
  const onboarding = await sb.from('member_onboarding').select('answers').eq('user_id', userId).maybeSingle();
  if (onboarding.error) return false;
  const answers = onboarding.data?.answers;
  return answers?.consentHealth === true && (type === 'ai_processing' || answers?.sharePractitioner === true);
}
