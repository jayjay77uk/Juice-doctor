'use server';

import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { wearableConsent, syncWearables } from './store';

/**
 * Connected Health actions. PROTOTYPE: "connect" grants consent and pulls
 * deterministic fixtures via the mock Thryve adapter — no live synchronisation.
 */

export async function connectWearableAction(): Promise<void> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return;
  }
  await wearableConsent.grant(userId);
  await syncWearables(userId);
  revalidatePath('/dashboard/connected-health');
}

export async function disconnectWearableAction(): Promise<void> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return;
  }
  await wearableConsent.revoke(userId);
  revalidatePath('/dashboard/connected-health');
}
