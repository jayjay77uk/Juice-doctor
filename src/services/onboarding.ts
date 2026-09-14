import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertSession } from '@/lib/auth/authorize';
import { onboardingSchema, ONBOARDING_GOALS } from '@/lib/onboarding';

export async function getOnboarding() {
  const { user } = await assertSession();
  const sb = await createSupabaseServerClient();
  if (!sb) return { available: false, answers: null, step: 0 };
  const { data, error } = await sb.from('member_onboarding').select('answers, step, completed_at').eq('user_id', user.id).maybeSingle();
  const parsed = onboardingSchema.safeParse(data?.answers);
  return { available: !error, answers: parsed.success ? parsed.data : null, step: data ? Number(data.step) : 0 };
}

export async function onboardingContext(userId: string): Promise<string | null> {
  const sb = createAdminClient(); if (!sb) return null;
  const { data } = await sb.from('member_onboarding').select('answers').eq('user_id', userId).maybeSingle();
  const parsed = onboardingSchema.safeParse(data?.answers);
  if (!parsed.success || !parsed.data.consentHealth) return null;
  const a = parsed.data;
  return ['Member-provided onboarding context (self-reported; not a diagnosis):',
    `Goals: ${a.goals.map(g => ONBOARDING_GOALS.find(x => x.key === g)?.label).join('; ')}`,
    a.ageRange && `Age range: ${a.ageRange}`, a.activity && `Activity: ${a.activity}`,
    a.sleepHours !== null && `Sleep hours: ${a.sleepHours}`, a.waterGlasses !== null && `Glasses of water daily: ${a.waterGlasses}`,
  ].filter(Boolean).join('\n');
}
