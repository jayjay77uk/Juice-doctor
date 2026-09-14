'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { onboardingSchema, type OnboardingAnswers } from '@/lib/onboarding';

export async function saveOnboardingAction(answers: OnboardingAnswers, step: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try { await assertSession(); } catch { return { ok: false, error: 'Please sign in.' }; }
  const parsed = z.object({ answers: onboardingSchema, step: z.number().int().min(0).max(4) }).safeParse({ answers, step });
  if (!parsed.success) return { ok: false, error: 'Please check your answers.' };
  if (!answers.consentHealth) return { ok: false, error: 'Your consent is needed before saving wellbeing information.' };
  if (step >= 2 && !parsed.data.answers.goals.length) return { ok: false, error: 'Choose at least one goal.' };
  const sb = await createSupabaseServerClient();
  if (!sb) return { ok: false, error: 'Your answers could not be saved. Please try again.' };
  const { error } = await sb.rpc('save_member_onboarding', { p_answers: parsed.data.answers, p_step: step });
  if (error) return { ok: false, error: 'Your answers could not be saved. Please try again.' };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/onboarding');
  return { ok: true };
}
