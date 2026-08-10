'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check } from 'lucide-react';
import { submitContact } from '@/services/actions';
import { idleAction } from '@/services/result';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Sending…' : 'Send message'}
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, idleAction);

  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-8">
        <span className="grid size-12 place-items-center rounded-full bg-green-100 text-secondary">
          <Check className="size-6" />
        </span>
        <h3 className="text-h3 text-foreground">Message received</h3>
        <p className="text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" required error={fieldErrors?.name?.[0]}>
          <Input id="name" name="name" autoComplete="name" aria-invalid={!!fieldErrors?.name} />
        </Field>
        <Field label="Email" name="email" required error={fieldErrors?.email?.[0]}>
          <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!fieldErrors?.email} />
        </Field>
      </div>
      <Field label="Subject" name="subject" error={fieldErrors?.subject?.[0]}>
        <Input id="subject" name="subject" />
      </Field>
      <Field label="Message" name="message" required error={fieldErrors?.message?.[0]}>
        <Textarea id="message" name="message" aria-invalid={!!fieldErrors?.message} />
      </Field>
      {state.status === 'error' && (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-4">
        <SubmitButton />
        <p className="text-xs text-muted-foreground">
          Email isn’t connected yet — messages from this form can’t be sent.
        </p>
      </div>
    </form>
  );
}
