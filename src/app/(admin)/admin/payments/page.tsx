import type { Metadata } from 'next';
import { Banknote, ReceiptText, Undo2, CalendarClock } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { payments, formatAmount } from '@/services/payments';
import { paymentsRepo } from '@/services/repositories/payments-repo';
import { subscriptionsService } from '@/services/subscriptions';
import { AdminHeader } from '@/components/admin/admin-header';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { Panel } from '@/components/admin/panel';
import { RecordPaymentForm, PaymentRowActions, InstalmentPlanForm, InstalmentControls } from '@/components/admin/payment-forms';

export const metadata: Metadata = createMetadata({ title: 'Payments' });
export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  succeeded: 'bg-secondary/10 text-secondary',
  pending: 'bg-primary/10 text-primary',
  failed: 'bg-danger/10 text-danger',
  refunded: 'bg-surface-muted text-muted-foreground',
};

export default async function PaymentsPage() {
  const [status, ledger, subsResult, plansResult] = await Promise.all([
    payments.status(),
    paymentsRepo.list(),
    subscriptionsService.list(),
    paymentsRepo.instalments.list(),
  ]);
  const subs = subsResult.ok ? subsResult.data : [];
  const subscriptionOptions = subs
    .filter((s) => s.memberId)
    .map((s) => ({ id: s.id, label: `${s.customerName} — ${s.planName} (${s.state})` }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Payments"
        description="The real payment ledger. No payment provider is connected — every entry is an admin-recorded manual payment; nothing is ever marked paid automatically."
        breadcrumbs={[{ label: 'Payments' }]}
      />

      <StatGrid>
        <StatCard label="Ledger entries" value={status.summary.count.toLocaleString()} icon={ReceiptText} />
        <StatCard
          label="Received (GBP)"
          value={formatAmount(status.summary.byCurrency.GBP ?? 0, 'GBP')}
          icon={Banknote}
        />
        <StatCard label="Refunded (all)" value={formatAmount(status.summary.refundedMinor, 'GBP')} icon={Undo2} />
        <StatCard label="Instalment schedules" value={plansResult.available ? plansResult.plans.length : '—'} icon={CalendarClock} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Record a manual payment" description="Creates a real ledger entry with the amount you enter, updates the subscription's payment record, and queues the member's receipt email.">
          {subscriptionOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions with a linked member account yet.</p>
          ) : (
            <RecordPaymentForm subscriptions={subscriptionOptions} />
          )}
        </Panel>
        <Panel title="Create an instalment schedule" description="Admin-entered amounts and due dates only — the platform never invents pricing.">
          {subscriptionOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions with a linked member account yet.</p>
          ) : (
            <InstalmentPlanForm subscriptions={subscriptionOptions} />
          )}
        </Panel>
      </div>

      <Panel title="Payment ledger" description="Append-only. Refunds are reconciliation records until a provider is connected — no money moves through the platform." padded={false}>
        {ledger.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledger.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-3 font-mono text-xs text-foreground">{p.reference}</td>
                    <td className="px-4 py-3 tabular-nums text-foreground">{formatAmount(p.amountMinor, p.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status] ?? ''}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.provider}</td>
                    <td className="max-w-64 truncate px-4 py-3 text-muted-foreground" title={p.description}>{p.description}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3">{p.status === 'succeeded' && <PaymentRowActions paymentId={p.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Instalment schedules" description="Due dates, partial-payment tracking and outstanding balances — all from admin-entered amounts." padded={false}>
        {!plansResult.available ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            Instalment schedules are not available yet — they require database migration 0031 (see the deployment guide). Nothing is simulated until it is applied.
          </p>
        ) : plansResult.plans.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">No instalment schedules yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {plansResult.plans.map((plan) => {
              const balance = payments.outstanding(plan);
              return (
                <li key={plan.id} className="flex flex-col gap-3 px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{plan.description}</span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Paid {formatAmount(balance.paidMinor, plan.currency)} · Outstanding {formatAmount(balance.dueMinor, plan.currency)}
                        {balance.overdueMinor > 0 && <span className="text-danger"> · Overdue {formatAmount(balance.overdueMinor, plan.currency)}</span>}
                      </span>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium">{plan.status}</span>
                      {plan.status === 'active' && <InstalmentControls planId={plan.id} mode="cancel-plan" />}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {plan.instalments.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">
                          #{item.sequence} · {formatAmount(item.amountMinor, plan.currency)} due {new Date(item.dueDate).toLocaleDateString('en-GB')}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.status === 'paid' ? 'bg-secondary/10 text-secondary' : item.status === 'cancelled' ? 'bg-surface-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                            {item.status}
                          </span>
                          {item.status === 'pending' && <InstalmentControls instalmentId={item.id} planId={plan.id} mode="mark-paid" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <p className="text-xs text-muted-foreground">
        Provider status: {status.configured ? `connected (${status.providerKey})` : status.selectedProvider ? `"${status.selectedProvider}" selected but not connected — adapter and credentials pending` : 'no provider selected'}. The webhook endpoint at /api/webhooks/payments answers 503 until a provider is connected.
      </p>
    </div>
  );
}
