'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Field, Input, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { EMPTY_ONBOARDING, ONBOARDING_GOALS, type OnboardingAnswers } from '@/lib/onboarding';
import { saveOnboardingAction } from '@/services/onboarding-actions';

export function OnboardingWizard({ initial, initialStep = 0, available = true }: { initial?: OnboardingAnswers | null; initialStep?: number; available?: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = React.useState(initial ?? EMPTY_ONBOARDING);
  const [step, setStep] = React.useState(initialStep);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const update = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => setAnswers(a => ({ ...a, [key]: value }));
  async function save(next: number, exit = false) {
    setBusy(true); setError(null);
    try {
      const r = await saveOnboardingAction(answers, next);
      if (!r.ok) { setError(r.error); return; }
      if (exit) { router.push('/dashboard'); return; }
      setStep(next);
    } catch { setError('Your answers could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-surface p-6 sm:p-9">
    <p className="mb-5 text-sm text-muted-foreground">Your wellbeing profile · Step {Math.min(step + 1, 4)} of 4</p>
    {!available && <p role="alert" className="mb-4 text-danger">Your profile is temporarily unavailable. Please try again before entering answers.</p>}
    {step === 0 && <div className="space-y-5"><h1 className="text-h2">Welcome</h1><p>A few questions help your specialists understand your goals. Your progress is saved as you continue, and you can return to edit it.</p>
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={answers.consentHealth} onChange={e => update('consentHealth', e.target.checked)} className="mt-1" /><span>I agree to Ask Juice Doctor storing and using the wellbeing information I provide to personalise my support. I can withdraw this consent in settings. <Link href="/privacy" className="underline">Privacy notice</Link></span></label>
    </div>}
    {step === 1 && <div className="space-y-5"><h2 className="text-h3">What brings you here?</h2><p>Choose the goals you would like support with.</p><div className="grid gap-3 sm:grid-cols-2">
      {ONBOARDING_GOALS.map(g => <button key={g.key} type="button" aria-pressed={answers.goals.includes(g.key)} onClick={() => update('goals', answers.goals.includes(g.key) ? answers.goals.filter(x => x !== g.key) : [...answers.goals, g.key])} className={`flex items-center justify-between rounded-xl border p-4 text-left ${answers.goals.includes(g.key) ? 'border-primary bg-primary/5' : 'border-border'}`}>{g.label}{answers.goals.includes(g.key) && <Check className="size-4" />}</button>)}
    </div></div>}
    {step === 2 && <div className="space-y-5"><h2 className="text-h3">A little about you</h2><p>These details are optional. They describe your current habits.</p><div className="grid gap-5 sm:grid-cols-2">
      <Field label="Age range" name="age"><Select id="age" value={answers.ageRange} onChange={e => update('ageRange', e.target.value as OnboardingAnswers['ageRange'])}><option value="">Prefer not to say</option>{['18–29','30–44','45–59','60+'].map(v => <option key={v}>{v}</option>)}</Select></Field>
      <Field label="Activity level" name="activity"><Select id="activity" value={answers.activity} onChange={e => update('activity', e.target.value as OnboardingAnswers['activity'])}><option value="">Prefer not to say</option>{['Sedentary','Lightly active','Moderately active','Very active'].map(v => <option key={v}>{v}</option>)}</Select></Field>
      <Field label="Sleep (hours per night)" name="sleep"><Input id="sleep" type="number" min={0} max={24} step="0.5" value={answers.sleepHours ?? ''} onChange={e => update('sleepHours', e.target.value === '' ? null : Number(e.target.value))} /></Field>
      <Field label="Water (glasses per day)" name="water"><Input id="water" type="number" min={0} max={30} value={answers.waterGlasses ?? ''} onChange={e => update('waterGlasses', e.target.value === '' ? null : Number(e.target.value))} /></Field>
    </div></div>}
    {step === 3 && <div className="space-y-5"><h2 className="text-h3">How should we support you?</h2><p>All choices are optional and can be changed later.</p>
      {([{ key: 'inAppFollowups', label: 'Receive specialist check-ins in my dashboard' }, { key: 'emailCheckins', label: 'Email check-ins when email delivery is connected' }, { key: 'dailyNudges', label: 'Receive daily nudges in my dashboard' }, { key: 'sharePractitioner', label: 'Share progress with my assigned practitioner' }] as const).map(p => <label key={p.key} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 text-sm">{p.label}<input type="checkbox" checked={answers[p.key]} onChange={e => update(p.key, e.target.checked)} /></label>)}
    </div>}
    {step === 4 && <div className="space-y-5"><Check className="size-10 text-secondary" /><h2 className="text-h2">Your profile is saved</h2><p>Your specialists can use your goals and wellbeing preferences when you talk with them.</p><div className="flex gap-3"><Button asChild><Link href="/dashboard">Go to my dashboard</Link></Button><Button intent="outline" onClick={() => setStep(1)}>Edit answers</Button></div></div>}
    {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
    {step < 4 && <div className="mt-8 flex flex-wrap justify-between gap-3"><Button intent="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={busy || step === 0}><ArrowLeft className="size-4" />Back</Button>
      {step > 0 && <Button intent="ghost" onClick={() => save(step, true)} disabled={busy || !available}>Save and exit</Button>}
      <Button onClick={() => save(step + 1)} disabled={busy || !available || !answers.consentHealth || (step === 1 && !answers.goals.length)}>{busy ? 'Saving…' : step === 3 ? 'Save profile' : 'Continue'}<ArrowRight className="size-4" /></Button></div>}
  </section>;
}
