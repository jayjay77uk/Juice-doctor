import { z } from 'zod';
export const ONBOARDING_GOALS = [
  { key: 'wellbeing', label: 'Improve everyday wellbeing' },
  { key: 'hydration', label: 'Build hydration habits' },
  { key: 'sleep', label: 'Improve sleep routines' },
  { key: 'nutrition', label: 'Eat more consistently' },
  { key: 'fitness', label: 'Move more regularly' },
  { key: 'stress', label: 'Manage everyday stress' },
] as const;
export const onboardingSchema = z.object({
  goals: z.array(z.enum(['wellbeing','hydration','sleep','nutrition','fitness','stress'])).max(6).transform(v => [...new Set(v)]),
  ageRange: z.enum(['', '18–29', '30–44', '45–59', '60+']),
  activity: z.enum(['', 'Sedentary', 'Lightly active', 'Moderately active', 'Very active']),
  sleepHours: z.number().finite().min(0).max(24).nullable(),
  waterGlasses: z.number().finite().int().min(0).max(30).nullable(),
  inAppFollowups: z.boolean(), emailCheckins: z.boolean(), dailyNudges: z.boolean(), sharePractitioner: z.boolean(),
  consentHealth: z.boolean(),
}).strict();
export type OnboardingAnswers = z.infer<typeof onboardingSchema>;
export const EMPTY_ONBOARDING: OnboardingAnswers = { goals: [], ageRange: '', activity: '', sleepHours: null, waterGlasses: null,
  inAppFollowups: false, emailCheckins: false, dailyNudges: false, sharePractitioner: false, consentHealth: false };
