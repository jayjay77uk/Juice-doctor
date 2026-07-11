'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check } from 'lucide-react';
import { createSupportTicketAction } from '@/services/support-actions';
import { idleAction } from '@/services/result';
import { Button } from '@/components/ui/button';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Sending…' : 'Send request'}
    </Button>
  );
}

/** Customer support request form (prototype — no message is actually sent). */
export function SupportForm() {
  const [state, formAction] = useActionState(createSupportTicketAction, idleAction);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="support-subject" className="text-sm font-medium text-foreground">
          Subject
        </label>
        <input
          id="support-subject"
          name="subject"
          type="text"
          placeholder="How can we help?"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="support-message" className="text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="support-message"
          name="message"
          rows={4}
          placeholder="Tell us a little more about what you need."
          className={inputClass}
        />
      </div>

      {state.status === 'success' && (
        <p className="flex items-center gap-2 text-sm text-secondary" role="status">
          <Check className="size-4" />
          {state.message}
        </p>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-4">
        <SubmitButton />
        <p className="text-xs text-muted-foreground">Prototype — no message is actually sent.</p>
      </div>
    </form>
  );
}
