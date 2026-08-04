import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/services/auth';

/**
 * Notification preferences — persisted on the member's user_preferences row
 * (email/push columns + a jsonb key for practitioner sharing). RLS scopes the
 * row to its owner; the admin client is only used for the session-resolved read.
 */

export interface NotificationPrefs {
  emailCheckins: boolean;
  dailyNudges: boolean;
  sharePractitioner: boolean;
}

const DEFAULTS: NotificationPrefs = { emailCheckins: true, dailyNudges: false, sharePractitioner: true };

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) return { ...DEFAULTS };
  const sb = createAdminClient();
  if (!sb) return { ...DEFAULTS };
  const { data } = await sb.from('user_preferences').select('email_notifications, push_notifications, preferences').eq('user_id', userId).maybeSingle();
  if (!data) return { ...DEFAULTS };
  const prefs = (data.preferences ?? null) as Record<string, unknown> | null;
  return {
    emailCheckins: data.email_notifications !== false,
    dailyNudges: data.push_notifications === true,
    sharePractitioner: prefs?.share_with_practitioner !== false,
  };
}

export async function saveNotificationPrefs(input: NotificationPrefs): Promise<boolean> {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) return false;
  const sb = await createSupabaseServerClient();
  if (!sb) return false;
  const { data: existing } = await sb.from('user_preferences').select('preferences').eq('user_id', userId).maybeSingle();
  const merged = {
    ...((existing?.preferences as Record<string, unknown> | null) ?? {}),
    share_with_practitioner: input.sharePractitioner,
  };
  const { error } = await sb
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        email_notifications: input.emailCheckins,
        push_notifications: input.dailyNudges,
        preferences: merged,
      },
      { onConflict: 'user_id' },
    );
  return !error;
}
