'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, ArrowRight, ArrowLeft, Sparkles, Droplets, Moon, Apple, Activity, Brain } from 'lucide-react';
import { Field, Input, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * User onboarding wizard — a multi-step, fully interactive flow. Answers are
 * not yet persisted; a future submit will write health_profiles / goals /
 * prefs. Architecture + interface only; no AI.
 */

const GOALS = [
  { key: 'goal-1', label: 'Goal One', icon: Sparkles },
  { key: 'goal-2', label: 'Goal Two', icon: Droplets },
  { key: 'goal-3', label: 'Goal Three', icon: Moon },
  { key: 'goal-4', label: 'Goal Four', icon: Apple },
  { key: 'goal-5', label: 'Goal Five', icon: Activity },
  { key: 'goal-6', label: 'Goal Six', icon: Brain },
];

const STEPS = ['Welcome', 'Your goals', 'Basic details', 'Preferences', 'Done'] as const;

export function OnboardingWizard() {
  const [step, setStep] = React.useState(0);
  const [goals, setGoals] = React.useState<string[]>([]);

  const toggleGoal = (key: string) =>
    setGoals((g) => (g.includes(key) ? g.filter((x) => x !== key) : [...g, key]));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Progress */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium transition-colors',
                i < step ? 'bg-green-100 text-secondary' : i === step ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted-foreground',
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            {i < STEPS.length - 1 && (
              <span className={cn('h-0.5 flex-1 rounded-full', i < step ? 'bg-green-300' : 'bg-surface-muted')} />
            )}
          </li>
        ))}
      </ol>

      <div className="rounded-3xl border border-border bg-surface p-7 sm:p-9">
        {step === 0 && (
          <div className="flex flex-col gap-4 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-teal-100 text-primary">
              <Sparkles className="size-6" />
            </span>
            <h1 className="text-h2 text-foreground">Welcome</h1>
            <p className="measure mx-auto text-muted-foreground">
              A few quick questions and we’ll tailor your experience. It takes about two minutes —
              and you can update your answers at any time.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-h3 text-foreground">What brings you here?</h2>
              <p className="text-muted-foreground">Choose everything that resonates.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {GOALS.map((g) => {
                const selected = goals.includes(g.key);
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => toggleGoal(g.key)}
                    aria-pressed={selected}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
                      selected ? 'border-primary bg-teal-50' : 'border-border hover:bg-surface-muted',
                    )}
                  >
                    <span className={cn('grid size-9 place-items-center rounded-full', selected ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted-foreground')}>
                      <g.icon className="size-4.5" />
                    </span>
                    <span className="font-medium text-foreground">{g.label}</span>
                    {selected && <Check className="ml-auto size-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-h3 text-foreground">A little about you</h2>
              <p className="text-muted-foreground">This helps us personalise your plan. Nothing you enter here is saved yet.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Age range" name="age">
                <Select id="age" name="age" defaultValue="">
                  <option value="" disabled>Select…</option>
                  <option>18–29</option>
                  <option>30–44</option>
                  <option>45–59</option>
                  <option>60+</option>
                </Select>
              </Field>
              <Field label="Activity level" name="activity">
                <Select id="activity" name="activity" defaultValue="">
                  <option value="" disabled>Select…</option>
                  <option>Sedentary</option>
                  <option>Lightly active</option>
                  <option>Moderately active</option>
                  <option>Very active</option>
                </Select>
              </Field>
              <Field label="Value A" name="sleep">
                <Input id="sleep" name="sleep" type="number" min="0" max="14" placeholder="7" />
              </Field>
              <Field label="Value B" name="water">
                <Input id="water" name="water" type="number" min="0" max="20" placeholder="4" />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-h3 text-foreground">How should we support you?</h2>
              <p className="text-muted-foreground">Set your preferences — you can change these anytime.</p>
            </div>
            <div className="flex flex-col gap-3">
              {['Email me weekly check-ins', 'Send gentle daily nudges', 'Share progress with my practitioner'].map((label) => (
                <label key={label} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                  <span className="text-sm text-foreground">{label}</span>
                  <input type="checkbox" defaultChecked className="size-4 accent-[var(--color-primary)]" />
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-green-100 text-secondary">
              <Check className="size-7" />
            </span>
            <h2 className="text-h2 text-foreground">You’re all set</h2>
            <p className="measure mx-auto text-muted-foreground">
              {goals.length > 0
                ? `We’ll focus on ${goals.length} area${goals.length === 1 ? '' : 's'} to start.`
                : 'Your journey is ready.'}{' '}
              (Saving your onboarding answers is coming soon — nothing was stored yet.)
            </p>
            <Button asChild className="mt-2">
              <Link href="/dashboard">
                Go to my dashboard <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Controls */}
        {step < STEPS.length - 1 && (
          <div className="mt-8 flex items-center justify-between">
            <Button type="button" intent="ghost" onClick={back} className={cn(step === 0 && 'invisible')}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="button" onClick={next} disabled={step === 1 && goals.length === 0}>
              {step === 0 ? 'Get started' : 'Continue'} <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
