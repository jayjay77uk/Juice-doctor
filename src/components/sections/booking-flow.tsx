'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, ArrowLeft, ArrowRight, CalendarCheck } from 'lucide-react';
import { submitBooking } from '@/services/actions';
import { idleAction } from '@/services/result';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { ph } from '@/content/placeholder';

export interface BookingService {
  slug: string;
  title: string;
  priceLabel: string;
}

const slots = [
  'Mon 14 Jul · 9:00am',
  'Mon 14 Jul · 2:30pm',
  'Wed 16 Jul · 11:00am',
  'Thu 17 Jul · 4:00pm',
  'Fri 18 Jul · 10:30am',
  'Sat 19 Jul · 9:30am',
];

const steps = ['Service', 'Time', 'Details'] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Confirming…' : ph.cta}
    </Button>
  );
}

export function BookingFlow({
  services,
  initialService,
}: {
  services: BookingService[];
  initialService?: string;
}) {
  const [step, setStep] = React.useState(0);
  const [service, setService] = React.useState(
    () => services.find((s) => s.slug === initialService)?.slug ?? '',
  );
  const [slot, setSlot] = React.useState('');
  const [state, formAction] = useActionState(submitBooking, idleAction);

  if (state.status === 'success') {
    const chosen = services.find((s) => s.slug === service);
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-10 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-green-100 text-secondary">
          <CalendarCheck className="size-7" />
        </span>
        <h2 className="text-h2 text-foreground">{ph.heading}</h2>
        <p className="measure text-muted-foreground">{state.message}</p>
        {chosen && (
          <p className="rounded-full bg-surface-muted px-4 py-2 text-sm text-foreground">
            {chosen.title} · {slot}
          </p>
        )}
      </div>
    );
  }

  const canNext = (step === 0 && service) || (step === 1 && slot);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)]">
      {/* Progress */}
      <ol className="flex border-b border-border">
        {steps.map((label, i) => (
          <li
            key={i}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 py-4 text-sm font-medium',
              i === step ? 'text-primary' : 'text-muted-foreground',
              i < step && 'text-secondary',
            )}
          >
            <span
              className={cn(
                'grid size-6 place-items-center rounded-full text-xs',
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                    ? 'bg-green-100 text-secondary'
                    : 'bg-surface-muted text-muted-foreground',
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <div className="p-6 sm:p-8">
        {step === 0 && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-serif text-lg text-foreground">{ph.subheading}</legend>
            {services.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setService(s.slug)}
                aria-pressed={service === s.slug}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-colors',
                  service === s.slug
                    ? 'border-primary bg-teal-50'
                    : 'border-border hover:bg-surface-muted',
                )}
              >
                <span className="font-medium text-foreground">{s.title}</span>
                <span className="text-sm text-muted-foreground">{s.priceLabel}</span>
              </button>
            ))}
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-serif text-lg text-foreground">{ph.subheading}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {slots.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlot(s)}
                  aria-pressed={slot === s}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm transition-colors',
                    slot === s
                      ? 'border-primary bg-teal-50 text-foreground'
                      : 'border-border text-foreground hover:bg-surface-muted',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Prototype — these are sample times, not live availability.
            </p>
          </fieldset>
        )}

        {step === 2 && (
          <form action={formAction} className="flex flex-col gap-5" noValidate>
            <input type="hidden" name="service" value={service} />
            <input type="hidden" name="slot" value={slot} />
            <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
              {services.find((s) => s.slug === service)?.title} · {slot}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" name="name" required error={fieldErrors?.name?.[0]}>
                <Input id="name" name="name" autoComplete="name" />
              </Field>
              <Field label="Email" name="email" required error={fieldErrors?.email?.[0]}>
                <Input id="email" name="email" type="email" autoComplete="email" />
              </Field>
            </div>
            <Field label="Anything we should know?" name="notes">
              <Textarea id="notes" name="notes" rows={3} />
            </Field>
            {state.status === 'error' && (
              <p className="text-sm text-danger" role="alert">
                {state.message}
              </p>
            )}
            <div className="flex items-center gap-3">
              <Button type="button" intent="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <SubmitButton />
            </div>
            <p className="text-xs text-muted-foreground">
              Prototype — no appointment is actually reserved.
            </p>
          </form>
        )}

        {step < 2 && (
          <div className="mt-6 flex items-center gap-3">
            {step > 0 && (
              <Button type="button" intent="ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
            )}
            <Button type="button" size="lg" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
