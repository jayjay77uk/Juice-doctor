'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight, Check } from 'lucide-react';
import { subscribeNewsletter } from '@/services/actions';
import { idleAction } from '@/services/result';
import { cn } from '@/lib/cn';

function SubmitButton({ inverse }: { inverse: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Subscribe"
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-60',
        inverse ? 'bg-cream-50 text-teal-800 hover:bg-white' : 'bg-primary text-primary-foreground hover:bg-primary-hover',
      )}
    >
      <ArrowRight className={cn('size-5', pending && 'animate-pulse')} />
    </button>
  );
}

export function NewsletterForm({ inverse = false }: { inverse?: boolean }) {
  const [state, formAction] = useActionState(subscribeNewsletter, idleAction);

  if (state.status === 'success') {
    return (
      <p
        className={cn(
          'inline-flex items-center gap-2 text-sm',
          inverse ? 'text-cream-100' : 'text-secondary',
        )}
        role="status"
      >
        <Check className="size-4" /> {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          required
          placeholder="Your email address"
          aria-invalid={state.status === 'error'}
          className={cn(
            'h-11 w-full rounded-full border px-4 text-sm outline-none transition-colors',
            inverse
              ? 'border-white/20 bg-white/10 text-cream-50 placeholder:text-cream-200/70 focus-visible:border-cream-100'
              : 'border-border bg-surface text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary',
          )}
        />
        <SubmitButton inverse={inverse} />
      </div>
      {state.status === 'error' && (
        <p className={cn('text-xs', inverse ? 'text-amber-200' : 'text-danger')} role="alert">
          {state.fieldErrors?.email?.[0] ?? state.message}
        </p>
      )}
    </form>
  );
}
