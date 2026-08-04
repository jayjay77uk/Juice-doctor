'use server';

import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { memberRepo } from './repositories/member-repo';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { saveNotificationPrefs } from './notification-prefs';

/**
 * Member-facing Server Actions. Every action authenticates the session and only
 * ever touches the signed-in user's own rows.
 */

export async function markAllNotificationsReadAction(): Promise<void> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return;
  }
  if (isSupabaseAdminConfigured()) await memberRepo.markAllNotificationsRead(userId);
  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard');
}

export async function saveNotificationPrefsAction(input: {
  emailCheckins: boolean;
  dailyNudges: boolean;
  sharePractitioner: boolean;
}): Promise<{ ok: boolean }> {
  try {
    await assertSession();
  } catch {
    return { ok: false };
  }
  const done = await saveNotificationPrefs({
    emailCheckins: Boolean(input.emailCheckins),
    dailyNudges: Boolean(input.dailyNudges),
    sharePractitioner: Boolean(input.sharePractitioner),
  });
  revalidatePath('/dashboard/settings');
  return { ok: done };
}
