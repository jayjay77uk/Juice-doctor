'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertSession } from '@/lib/auth/authorize';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Member profile/context actions — the signed-in member maintains their OWN
 * account context. The display name writes through the RLS user client
 * (profile_self_update); health basics upsert keyed strictly to the session's
 * user id. Only the context the platform actually uses is collected.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

const nameSchema = z.object({
  displayName: z.string().trim().min(2, 'Please enter a name (at least 2 characters).').max(80),
});

export async function updateDisplayNameAction(input: { displayName: string }): Promise<{ ok: boolean; error?: string }> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return { ok: false, error: 'Please sign in.' };
  }
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the name.' };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Not available right now.' };
  // RLS (profile_self_update) restricts the write to the caller's own row.
  const { error } = await supabase.from('profiles').update({ display_name: parsed.data.displayName }).eq('id', userId);
  if (error) return { ok: false, error: 'Could not update your name. Please try again.' };
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}

const BIOLOGICAL_SEX = ['female', 'male', 'intersex', 'unknown'] as const;

const basicsSchema = z.object({
  dateOfBirth: z.string().trim().optional().or(z.literal('')),
  biologicalSex: z.enum(BIOLOGICAL_SEX).optional().or(z.literal('')),
  heightCm: z.string().trim().optional().or(z.literal('')),
  weightKg: z.string().trim().optional().or(z.literal('')),
});

export async function updateHealthBasicsAction(input: {
  dateOfBirth?: string;
  biologicalSex?: string;
  heightCm?: string;
  weightKg?: string;
}): Promise<{ ok: boolean; error?: string }> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return { ok: false, error: 'Please sign in.' };
  }
  const parsed = basicsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Please check the fields.' };

  const patch: Record<string, unknown> = { user_id: userId, organisation_id: ORG };
  if (parsed.data.dateOfBirth) {
    const d = new Date(parsed.data.dateOfBirth);
    const now = new Date();
    if (Number.isNaN(d.getTime()) || d > now || d.getFullYear() < now.getFullYear() - 120) {
      return { ok: false, error: 'Please enter a valid date of birth.' };
    }
    patch.date_of_birth = parsed.data.dateOfBirth;
  }
  if (parsed.data.biologicalSex) patch.biological_sex = parsed.data.biologicalSex;
  if (parsed.data.heightCm) {
    const h = Number(parsed.data.heightCm);
    if (!Number.isFinite(h) || h < 50 || h > 260) return { ok: false, error: 'Height should be between 50 and 260 cm.' };
    patch.height_cm = h;
  }
  if (parsed.data.weightKg) {
    const w = Number(parsed.data.weightKg);
    if (!Number.isFinite(w) || w < 20 || w > 400) return { ok: false, error: 'Weight should be between 20 and 400 kg.' };
    patch.weight_kg = w;
  }
  if (Object.keys(patch).length <= 2) return { ok: false, error: 'Nothing to update.' };

  const sb = createAdminClient();
  if (!sb) return { ok: false, error: 'Not available right now.' };
  // Upsert keyed strictly to the session's own user id.
  const { error } = await sb.from('health_profiles').upsert(patch, { onConflict: 'user_id' });
  if (error) return { ok: false, error: 'Could not save your details. Please try again.' };
  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  return { ok: true };
}
