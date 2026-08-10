'use server';

import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { track } from '@/lib/monitoring/events';
import { carePlan } from './care-plan';

/**
 * Person-facing care-plan action transitions. The person owns their shared plan, so
 * they can accept or decline a specialist's PROPOSED action. Ownership is verified
 * (the action's plan must belong to the signed-in person) before any transition.
 */

async function authorise(actionId: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return { ok: false, error: 'Please sign in.' };
  }
  const owned = await carePlan.actionWithOwner(actionId);
  if (!owned || owned.userId !== userId) return { ok: false, error: 'Action not found.' };
  return { ok: true, userId };
}

export async function acceptCarePlanActionAction(actionId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await authorise(actionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const ok = await carePlan.acceptAction(actionId, auth.userId);
  if (ok) {
    await carePlan.activateAction(actionId, auth.userId);
    await track('care_plan.action', { transition: 'accepted' }, auth.userId);
    revalidatePath('/dashboard/care-plan');
  }
  return { ok };
}

export async function declineCarePlanActionAction(actionId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await authorise(actionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const ok = await carePlan.declineAction(actionId, reason, auth.userId);
  if (ok) {
    await track('care_plan.action', { transition: 'declined' }, auth.userId);
    revalidatePath('/dashboard/care-plan');
  }
  return { ok };
}

export async function completeCarePlanActionAction(actionId: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await authorise(actionId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const ok = await carePlan.completeAction(actionId, auth.userId);
  if (ok) {
    await track('care_plan.action', { transition: 'completed' }, auth.userId);
    revalidatePath('/dashboard/care-plan');
  }
  return { ok };
}
