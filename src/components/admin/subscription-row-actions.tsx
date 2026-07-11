'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  setSubStateAction,
  changePlanAction,
  recordPaymentAction,
} from '@/services/subscription-actions';
import { Button } from '@/components/ui/button';
import type { SubscriptionState } from '@/types/crm';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

type Res = { ok: true } | { ok: false; error: string };

/**
 * Per-row controls for a customer subscription — set state (activate / suspend /
 * cancel), change plan, and record a manual payment. Prototype only: no live
 * payment provider is connected.
 */
export function SubscriptionRowActions({
  subscriptionId,
  plans,
  state,
}: {
  subscriptionId: string;
  plans: { id: string; name: string }[];
  state: SubscriptionState;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [planId, setPlanId] = React.useState(plans[0]?.id ?? '');

  function run(fn: () => Promise<Res>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending || state === 'active'}
          onClick={() => run(() => setSubStateAction(subscriptionId, 'active'))}
        >
          Activate
        </Button>
        <Button
          size="sm"
          intent="ghost"
          disabled={pending || state === 'suspended'}
          onClick={() => run(() => setSubStateAction(subscriptionId, 'suspended'))}
        >
          Suspend
        </Button>
        <Button
          size="sm"
          intent="ghost"
          disabled={pending || state === 'canceled'}
          onClick={() => run(() => setSubStateAction(subscriptionId, 'canceled'))}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          intent="outline"
          disabled={pending}
          onClick={() => run(() => recordPaymentAction(subscriptionId, 'Manual payment'))}
        >
          Record payment
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          aria-label="Plan"
          className={`${inputClass} max-w-[12rem]`}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          intent="ghost"
          disabled={pending || !planId}
          onClick={() => run(() => changePlanAction(subscriptionId, planId))}
        >
          Change
        </Button>
      </div>
    </div>
  );
}
