'use client';

import { useActionState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { grantAccessAction } from '@/services/subscription-actions';
import { idleAction } from '@/services/result';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

/**
 * Grant a registered member access to a plan. The operational stand-in for
 * self-serve checkout while pricing and a payment provider are undecided —
 * it creates the real entitlement record and takes no payment.
 */
export function GrantAccessForm({ plans }: { plans: { id: string; name: string; scope: string }[] }) {
  const [state, action, pending] = useActionState(grantAccessAction, idleAction);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Member email
          <input name="email" type="email" required maxLength={254} className={inputClass} placeholder="person@example.com" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Plan
          <select name="planId" className={inputClass} required defaultValue="">
            <option value="" disabled>
              Choose a plan…
            </option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.scope})
              </option>
            ))}
          </select>
        </label>
      </div>
      {state.status !== 'idle' && state.message && (
        <p className={state.status === 'error' ? 'text-sm text-danger' : 'text-sm text-secondary'} role="status">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Grant access
        </Button>
        <p className="text-xs text-muted-foreground">
          The member must already have an account. No payment is taken or recorded.
        </p>
      </div>
    </form>
  );
}
