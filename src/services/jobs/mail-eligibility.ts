import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
/** Revalidate queued follow-ups at dispatch; never send a stale paid reminder
 * or an opted-out check-in just because it was once eligible. */
export async function followUpMailEligible(
  template: string,
  dedupeKey: string | null,
  to: string,
): Promise<boolean> {
  if (!['member.weekly_checkin', 'payment.instalment_reminder'].includes(template)) return true;
  const sb = createAdminClient();
  const id = dedupeKey?.split(':')[1];
  if (!sb || !z.string().uuid().safeParse(id).success) return false;
  let memberId = id!;
  if (template === 'payment.instalment_reminder') {
    const item = await sb
      .from('payment_instalments')
      .select('status,due_date,plan_id')
      .eq('id', id!)
      .maybeSingle();
    if (
      item.error ||
      !item.data ||
      item.data.status !== 'pending' ||
      item.data.due_date > new Date().toISOString().slice(0, 10)
    )
      return false;
    const plan = await sb
      .from('payment_instalment_plans')
      .select('member_id,status')
      .eq('id', item.data.plan_id)
      .maybeSingle();
    if (plan.error || !plan.data || plan.data.status !== 'active') return false;
    memberId = plan.data.member_id;
  } else {
    const prefs = await sb
      .from('user_preferences')
      .select('email_notifications,preferences')
      .eq('user_id', memberId)
      .maybeSingle();
    if (prefs.error) return false;
    if (prefs.data?.email_notifications === false) return false;
    if (prefs.data?.preferences?.email_checkins_configured !== true) {
      const onboarding = await sb
        .from('member_onboarding')
        .select('answers')
        .eq('user_id', memberId)
        .maybeSingle();
      if (onboarding.error || onboarding.data?.answers?.emailCheckins !== true) return false;
    }
  }
  const profile = await sb.from('profiles').select('status').eq('id', memberId).maybeSingle();
  if (profile.error || profile.data?.status !== 'active') return false;
  const auth = await sb.auth.admin.getUserById(memberId);
  return !auth.error && Boolean(auth.data.user?.email_confirmed_at) && auth.data.user?.email === to;
}
