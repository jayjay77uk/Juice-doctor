'use server';

import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { memberRepo } from './repositories/member-repo';
import { isSupabaseAdminConfigured } from '@/lib/env';

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
