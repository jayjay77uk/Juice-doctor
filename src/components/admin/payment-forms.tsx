'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  recordManualPaymentAction,
  markPaymentRefundedAction,
  createInstalmentPlanAction,
  markInstalmentPaidAction,
  cancelInstalmentPlanAction,
} from '@/services/payment-actions';
import { idleAction } from '@/services/result';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

const CURRENCIES = ['GBP', 'USD', 'EUR'];

interface SubscriptionOption {
  id: string;
  label: string;
}

/** Record a manual payment (admin-entered amount) against a subscription. */
export function RecordPaymentForm({ subscriptions }: { subscriptions: SubscriptionOption[] }) {
  const [state, action, pending] = useActionState(recordManualPaymentAction, idleAction);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Subscription
        <select name="subscriptionId" className={inputClass} required>
          <option value="">Choose…</option>
          {subscriptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Amount
          <input name="amount" type="number" step="0.01" min="0.01" className={inputClass} placeholder="e.g. 49.00" required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Currency
          <select name="currency" className={inputClass} defaultValue="GBP">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Note
        <input name="note" maxLength={300} className={inputClass} placeholder="How the payment was received (e.g. bank transfer reference)" />
      </label>
      {state.status !== 'idle' && state.message && (
        <p className={state.status === 'error' ? 'text-sm text-danger' : 'text-sm text-secondary'} role="status">
          {state.message}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Record payment
        </Button>
      </div>
    </form>
  );
}

/** Refund-state control for a succeeded ledger payment. */
export function PaymentRowActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!confirming) {
    return (
      <Button type="button" intent="outline" size="sm" onClick={() => setConfirming(true)}>
        Mark refunded
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await markPaymentRefundedAction(paymentId);
            if (!res.ok) setError(res.error ?? 'Failed.');
            else setConfirming(false);
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} Confirm refund record
      </Button>
      <Button type="button" intent="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
    </span>
  );
}

/** Create an instalment schedule with admin-entered amounts and due dates. */
export function InstalmentPlanForm({ subscriptions }: { subscriptions: SubscriptionOption[] }) {
  const [state, action, pending] = useActionState(createInstalmentPlanAction, idleAction);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Subscription
        <select name="subscriptionId" className={inputClass} required>
          <option value="">Choose…</option>
          {subscriptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Description
        <input name="description" maxLength={300} className={inputClass} placeholder="What this schedule covers" required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Currency
          <select name="currency" className={inputClass} defaultValue="GBP">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Instalments — one per line, amount:YYYY-MM-DD
        <textarea name="schedule" rows={4} className={inputClass} placeholder={'50:2026-09-01\n50:2026-10-01'} required />
      </label>
      {state.status !== 'idle' && state.message && (
        <p className={state.status === 'error' ? 'text-sm text-danger' : 'text-sm text-secondary'} role="status">
          {state.message}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Create schedule
        </Button>
      </div>
    </form>
  );
}

/** Mark an instalment paid (records a real ledger payment) or cancel a plan. */
export function InstalmentControls({ instalmentId, planId, mode }: { instalmentId?: string; planId: string; mode: 'mark-paid' | 'cancel-plan' }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <Button
        type="button"
        intent={mode === 'cancel-plan' ? 'ghost' : 'outline'}
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res =
              mode === 'mark-paid' && instalmentId
                ? await markInstalmentPaidAction(instalmentId, planId)
                : await cancelInstalmentPlanAction(planId);
            if (!res.ok) setError(res.error ?? 'Failed.');
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {mode === 'mark-paid' ? 'Mark paid' : 'Cancel schedule'}
      </Button>
    </span>
  );
}
