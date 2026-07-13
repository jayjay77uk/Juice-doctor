'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle } from 'lucide-react';
import { createAgentAction } from '@/services/admin-actions';
import { idleAction } from '@/services/result';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Creating…' : 'Create agent'}
    </Button>
  );
}

export function CreateAgentForm() {
  const [state, formAction] = useActionState(createAgentAction, idleAction);
  const [slug, setSlug] = React.useState('');
  const fe = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === 'error' && (
        <p className="inline-flex items-center gap-2 rounded-xl bg-[#f6e3e0] px-4 py-2.5 text-sm text-danger" role="alert">
          <AlertCircle className="size-4" /> {state.message}
        </p>
      )}
      <Field label="Name" name="name" required error={fe?.name?.[0]}>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Specialist AI"
          onChange={(e) => setSlug(slugify(e.target.value))}
        />
      </Field>
      <Field label="Slug" name="slug" required hint="Unique identifier — lowercase, hyphenated." error={fe?.slug?.[0]}>
        <Input id="slug" name="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="new-specialist" />
      </Field>
      <Field label="Role" name="role" required hint="A short description of what this agent does." error={fe?.role?.[0]}>
        <Input id="role" name="role" placeholder="Customer support specialist" />
      </Field>
      <Field label="Description" name="description">
        <Textarea id="description" name="description" rows={3} placeholder="What is this agent for?" />
      </Field>
      <div className="flex items-center gap-4">
        <Submit />
        <p className="text-xs text-muted-foreground">
          The agent starts as a draft. Configure its prompt, model, memory and safety next.
        </p>
      </div>
    </form>
  );
}
