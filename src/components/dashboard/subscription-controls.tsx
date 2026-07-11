'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { customerCancelAction, customerChangePlanAction } from '@/services/subscription-actions';

/**
 * Customer-facing controls for a single subscription (prototype). Lets the member
 * change/upgrade their plan or cancel access, then refreshes the server data.
 */
export function SubscriptionControls({
  subscriptionId,
  plans,
  currentPlanId,
}: {
  subscriptionId: string;
  plans: { id: string; name: string }[];
  currentPlanId: string;
}) {
  const router = useRouter();
  const [planId, setPlanId] = React.useState(currentPlanId);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const planChanged = planId !== currentPlanId;

  function onChangePlan() {
    setError(null);
    startTransition(async () => {
      const res = await customerChangePlanAction(subscriptionId, planId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function onCancel() {
    setError(null);
    startTransition(async () => {
      const res = await customerCancelAction(subscriptionId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Change or upgrade plan</span>
          <select
            value={planId}
            disabled={pending}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={pending || !planChanged} onClick={onChangePlan}>
            <RefreshCw className="size-4" /> {pending ? 'Working…' : 'Change plan'}
          </Button>
          <Button size="sm" intent="outline" disabled={pending} onClick={onCancel}>
            <XCircle className="size-4" /> Cancel
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
