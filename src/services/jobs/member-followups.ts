import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { followUpId, followUpPeriods } from '@/lib/follow-up';
import { featureFlags } from '../feature-flags';
import { sendTemplateMail } from '../mail';
import type { JobResult } from './registry';

export async function memberFollowups(): Promise<JobResult> {
  const name = 'member-follow-ups';
  let processed = 0;
  const sb = createAdminClient();
  if (!sb || !(await featureFlags.isEnabled('platform.notifications')))
    return {
      name,
      status: 'skipped',
      processed,
      detail: 'Notifications are disabled or storage is unavailable.',
    };
  const { day, week } = followUpPeriods();
  let cursor = '';
  for (;;) {
    let q = sb
      .from('profiles')
      .select('id,organisation_id')
      .eq('role', 'member')
      .eq('status', 'active')
      .order('id')
      .limit(200);
    if (cursor) q = q.gt('id', cursor);
    const members = await q;
    if (members.error)
      return {
        name,
        status: 'skipped',
        processed,
        detail: 'Member listing failed; recorded notifications remain deduplicated for retry.',
      };
    if (!members.data.length) break;
    for (const member of members.data) {
      if (!member.organisation_id) continue;
      const [prefs, onboarding] = await Promise.all([
        sb
          .from('user_preferences')
          .select('email_notifications,push_notifications,preferences')
          .eq('user_id', member.id)
          .maybeSingle(),
        sb.from('member_onboarding').select('answers').eq('user_id', member.id).maybeSingle(),
      ]);
      if (prefs.error || onboarding.error) continue;
      const answers = onboarding.data?.answers ?? {};
      const daily = prefs.data
        ? prefs.data.push_notifications === true
        : answers.dailyNudges === true;
      const weekly = prefs.data?.preferences?.in_app_followups ?? answers.inAppFollowups === true;
      const email = prefs.data
        ? prefs.data.email_notifications === true && (prefs.data.preferences?.email_checkins_configured === true || answers.emailCheckins === true)
        : answers.emailCheckins === true;
      for (const type of [daily ? 'daily' : null, weekly ? 'weekly' : null].filter(Boolean)) {
        const id = followUpId(`${member.id}:${type}:${type === 'daily' ? day : week}`);
        const saved = await sb
          .from('notifications')
          .upsert(
            {
              id,
              user_id: member.id,
              organisation_id: member.organisation_id,
              type: `wellbeing.${type}`,
              title: type === 'daily' ? 'Your daily check-in' : 'Your weekly check-in',
              body: 'Take a moment to reflect on your goals. Your journal and care plan are ready when you are.',
              channel: 'in_app',
              data: { href: '/dashboard/journal' },
            },
            { onConflict: 'id', ignoreDuplicates: true },
          )
          .select('id');
        if (!saved.error) processed += saved.data?.length ?? 0;
      }
      if (email) {
        const auth = await sb.auth.admin.getUserById(member.id);
        if (auth.error || !auth.data.user?.email_confirmed_at || !auth.data.user.email) continue;
        const result = await sendTemplateMail({
          to: auth.data.user.email,
          template: 'member.weekly_checkin',
          params: {},
          dedupeKey: `checkin:${member.id}:${week}`,
        });
        if (result.recorded && result.reason !== 'duplicate') processed++;
      }
    }
    cursor = members.data[members.data.length - 1]!.id;
  }
  return {
    name,
    status: 'ran',
    processed,
    detail: `${processed} new notifications recorded. Email delivery depends on the connected provider and free allowance.`,
  };
}
