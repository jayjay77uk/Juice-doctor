'use server';

import { revalidatePath } from 'next/cache';
import { assertRole, assertSession } from '@/lib/auth/authorize';
import { connectWearable, disconnectWearable, resyncForUser } from './herne/wearable/connections';
import { auditRepo } from './repositories/audit-repo';

/**
 * Wearable connection actions. Member actions act only on the member's OWN
 * connection; admin resync is staff-gated. Everything degrades honestly while
 * the provider is unconnected — nothing simulates a device.
 */

export async function connectWearableAction(): Promise<{ ok: boolean; authorisationUrl?: string; error?: string }> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return { ok: false, error: 'Please sign in.' };
  }
  const result = await connectWearable(userId);
  if (result.ok) revalidatePath('/dashboard/connected-health');
  return result;
}

export async function disconnectWearableAction(): Promise<{ ok: boolean; deleted: number; error?: string }> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return { ok: false, deleted: 0, error: 'Please sign in.' };
  }
  const result = await disconnectWearable(userId);
  revalidatePath('/dashboard/connected-health');
  return result.ok ? result : { ...result, error: 'Disconnect is not available right now.' };
}

/** Staff-triggered pull-and-ingest for one member's connection. */
export async function adminResyncWearableAction(userId: string): Promise<{ ok: boolean; stored: number; error?: string }> {
  let actorId: string;
  try {
    actorId = (await assertRole('staff')).user.id;
  } catch {
    return { ok: false, stored: 0, error: 'Not authorised.' };
  }
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, stored: 0, error: 'Invalid member.' };
  const result = await resyncForUser(userId);
  if (result.ok) {
    await auditRepo.log({ actorId, action: 'wearable.resync', entityType: 'user_wearable_connections', entityId: userId, after: { stored: result.stored } });
  }
  revalidatePath('/admin/herne/wearable');
  return result;
}
