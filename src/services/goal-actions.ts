'use server';

import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { memberRepo } from './repositories/member-repo';

/** Create a goal for the signed-in member (own record only, validated server-side). */

const CATEGORIES = ['hydration', 'nutrition', 'movement', 'sleep', 'weight', 'wellbeing', 'other'] as const;

export async function createGoalAction(input: {
  category: string;
  title: string;
  description?: string;
  targetValue?: string;
  unit?: string;
  targetDate?: string;
}): Promise<{ ok: boolean; error?: string }> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return { ok: false, error: 'Please sign in.' };
  }
  if (!isSupabaseAdminConfigured()) return { ok: false, error: 'Not available in preview mode.' };

  const title = input.title.trim().slice(0, 120);
  if (title.length < 3) return { ok: false, error: 'Please give your goal a name (at least 3 characters).' };
  const category = (CATEGORIES as readonly string[]).includes(input.category) ? input.category : 'other';
  const targetValue = input.targetValue?.trim() ? Number(input.targetValue) : null;
  if (targetValue != null && (!Number.isFinite(targetValue) || targetValue < 0)) {
    return { ok: false, error: 'Please enter a valid target number.' };
  }
  let targetDate: string | null = null;
  if (input.targetDate?.trim()) {
    const t = new Date(input.targetDate);
    if (Number.isNaN(t.getTime())) return { ok: false, error: 'Please choose a valid target date.' };
    targetDate = input.targetDate;
  }

  const result = await memberRepo.createGoal(userId, {
    category,
    title,
    description: input.description?.slice(0, 500) ?? null,
    targetValue,
    unit: input.unit?.slice(0, 20) ?? null,
    targetDate,
  });
  if (result.ok) {
    revalidatePath('/dashboard/goals');
    revalidatePath('/dashboard');
  }
  return result;
}

const GOAL_STATUSES = ['active', 'achieved', 'paused', 'abandoned'] as const;

/** Update the signed-in member's own goal (progress %, status, current value). */
export async function updateGoalAction(input: {
  goalId: string;
  progress?: number;
  status?: string;
  currentValue?: string;
}): Promise<{ ok: boolean; error?: string }> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return { ok: false, error: 'Please sign in.' };
  }
  if (!isSupabaseAdminConfigured()) return { ok: false, error: 'Not available in preview mode.' };
  if (!input.goalId) return { ok: false, error: 'Goal not found.' };

  const patch: { progress?: number; status?: (typeof GOAL_STATUSES)[number]; currentValue?: number | null } = {};
  if (input.progress !== undefined) {
    const p = Math.round(Number(input.progress));
    if (!Number.isFinite(p) || p < 0 || p > 100) return { ok: false, error: 'Progress must be between 0 and 100.' };
    patch.progress = p;
    // Reaching 100% marks the goal achieved unless a status was chosen.
    if (p === 100 && input.status === undefined) patch.status = 'achieved';
  }
  if (input.status !== undefined) {
    if (!(GOAL_STATUSES as readonly string[]).includes(input.status)) return { ok: false, error: 'Please choose a valid status.' };
    patch.status = input.status as (typeof GOAL_STATUSES)[number];
  }
  if (input.currentValue !== undefined) {
    const v = input.currentValue.trim() === '' ? null : Number(input.currentValue);
    if (v !== null && (!Number.isFinite(v) || v < 0)) return { ok: false, error: 'Please enter a valid current value.' };
    patch.currentValue = v;
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nothing to update.' };

  const result = await memberRepo.updateGoal(userId, input.goalId, patch);
  if (result.ok) {
    revalidatePath('/dashboard/goals');
    revalidatePath('/dashboard');
  }
  return result;
}
