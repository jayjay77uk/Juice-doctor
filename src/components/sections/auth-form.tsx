'use client';

import * as React from 'react';
import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check } from 'lucide-react';
import { signIn, register } from '@/services/actions';
import { idleAction } from '@/services/result';
import { routes } from '@/config/routes';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {pending ? 'Please wait…' : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  authReal = false,
  next,
}: {
  mode: 'login' | 'register';
  authReal?: boolean;
  next?: string | undefined;
}) {
  const action = mode === 'login' ? signIn : register;
  const [state, formAction] = useActionState(action, idleAction);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-green-100 text-secondary">
          <Check className="size-6" />
        </span>
        <p className="text-muted-foreground">{state.message}</p>
        <Button asChild intent="primary" className="mt-2">
          <Link href={routes.dashboard.href}>Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {mode === 'register' && (
        <Field label="Full name" name="name" required error={fieldErrors?.name?.[0]}>
          <Input id="name" name="name" autoComplete="name" />
        </Field>
      )}
      <Field label="Email" name="email" required error={fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </Field>
      <Field label="Password" name="password" required error={fieldErrors?.password?.[0]}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </Field>
      {mode === 'register' && (
        <Field label="Confirm password" name="confirm" required error={fieldErrors?.confirm?.[0]}>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
        </Field>
      )}
      {state.status === 'error' && !fieldErrors && (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}
      <div className="mt-2">
        <SubmitButton label={mode === 'login' ? 'Log in' : 'Create account'} />
      </div>
      {!authReal && (
        <p className="rounded-lg bg-surface-muted px-4 py-3 text-center text-xs text-muted-foreground">
          Prototype — no real account is created. The dashboard is a demonstration shell.
        </p>
      )}
    </form>
  );
}
