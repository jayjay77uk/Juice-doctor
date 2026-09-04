import { CreditCard, CalendarClock, ReceiptText, Sparkles } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { SubscriptionControls } from '@/components/dashboard/subscription-controls';
import { member } from '@/services/member';
import { subscriptionsService } from '@/services/subscriptions';
import { specialists } from '@/services/specialists';
import { assertSession } from '@/lib/auth/authorize';
import { paymentsRepo } from '@/services/repositories/payments-repo';
import { payments, formatAmount } from '@/services/payments';
import { customerSubscribeFormAction } from '@/services/subscription-actions';

export const metadata = createMetadata({ title: 'My subscriptions' });
const SCOPE_LABEL: Record<string, string> = { single: 'Single specialist', multiple: 'Selected specialists', all: 'All-access' };

export default async function MySubscriptionsPage() {
  const session = await assertSession();
  const [subsResult, plansResult, followUpsResult, specialistsResult, myPayments, myPlans] = await Promise.all([
    member.mySubscriptions(), subscriptionsService.plans.list(), member.myFollowUps(), specialists.all(), paymentsRepo.forMember(session.user.id), paymentsRepo.instalments.list({ memberId: session.user.id }),
  ]);
  const subscriptions = subsResult.ok ? subsResult.data : [];
  const plans = plansResult.ok ? plansResult.data : [];
  const followUps = followUpsResult.ok ? followUpsResult.data : [];
  const specialistNames = new Map((specialistsResult.ok ? specialistsResult.data : []).map((s) => [s.slug, s.name]));
  const planOptions = plans.map((p) => ({ id: p.id, name: p.name }));
  const demoPlan = plans.find((p) => p.name === 'Specialist Demo');
  const hasDemo = demoPlan ? subscriptions.some((s) => s.planId === demoPlan.id && (s.state === 'active' || s.state === 'trialing')) : false;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader title="My subscriptions" description="Manage the specialist AI plans you're subscribed to." />
      {!hasDemo && demoPlan && (
        <Panel title="Specialist demonstration access" description="Activate temporary free access to all specialist AIs. No payment is taken.">
          <form action={customerSubscribeFormAction} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-foreground" /><p className="text-sm text-muted-foreground">Use this free demo access to test the complete specialist experience today. You can replace it with paid checkout later.</p></div>
            <input type="hidden" name="planId" value={demoPlan.id} />
            <button type="submit" className="inline-flex shrink-0 items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Activate demo access</button>
          </form>
        </Panel>
      )}
      {subscriptions.length === 0 ? (
        <Panel title="No subscriptions yet"><EmptyState icon={CreditCard} title="You have no active subscriptions" description="Activate the free demonstration access above or subscribe to a plan when available." /></Panel>
      ) : (
        <div className="flex flex-col gap-5">{subscriptions.map((sub) => { const covered = sub.scope === 'all' ? ['Every available specialist AI'] : sub.specialistSlugs.map((slug) => specialistNames.get(slug) ?? slug); return (
          <Panel key={sub.id} title={sub.planName} description={SCOPE_LABEL[sub.scope] ?? sub.scope} actions={<StatusBadge status={sub.state} />}>
            <div className="flex flex-col gap-5"><div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1"><p className="text-xs font-medium text-muted-foreground">Access scope</p><StatusBadge status={sub.scope} tone="teal" /></div>
              <div className="flex flex-col gap-1"><p className="text-xs font-medium text-muted-foreground">Covered specialists</p><div className="flex flex-wrap gap-2">{covered.map((label) => <span key={label} className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-1 text-xs text-foreground">{label}</span>)}</div></div>
              <div className="flex flex-col gap-1"><p className="text-xs font-medium text-muted-foreground">Started</p><p className="text-sm text-foreground">{sub.startedAt || '—'}</p></div>
              <div className="flex flex-col gap-1"><p className="text-xs font-medium text-muted-foreground">Last payment</p><p className="text-sm text-foreground">{sub.lastPaymentAt ?? '—'}</p></div>
            </div><div className="border-t border-border pt-5"><SubscriptionControls subscriptionId={sub.id} plans={planOptions} currentPlanId={sub.planId} /></div></div>
          </Panel>); })}</div>
      )}
      <Panel title="Payment history" description="Payments the team has recorded against your account." padded={false}>{myPayments.length === 0 ? <div className="px-6 py-6"><EmptyState icon={ReceiptText} title="No payments recorded" description="Payments are arranged with the team and appear here once recorded." /></div> : <ul className="divide-y divide-border">{myPayments.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm"><span className="min-w-0"><span className="font-mono text-xs text-muted-foreground">{p.reference}</span><span className="ml-3 truncate text-foreground">{p.description}</span></span><span className="flex shrink-0 items-center gap-3"><span className="tabular-nums text-foreground">{formatAmount(p.amountMinor, p.currency)}</span><StatusBadge status={p.status} /><span className="text-xs tabular-nums text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('en-GB')}</span></span></li>)}</ul>}</Panel>
      {myPlans.available && myPlans.plans.length > 0 && <Panel title="Instalment schedule" description="Agreed instalments and what remains outstanding." padded={false}><ul className="divide-y divide-border">{myPlans.plans.map((plan) => { const balance = payments.outstanding(plan); return <li key={plan.id} className="flex flex-col gap-2 px-6 py-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-medium text-foreground">{plan.description}</span><span className="text-xs text-muted-foreground">Paid {formatAmount(balance.paidMinor, plan.currency)} · Outstanding {formatAmount(balance.dueMinor, plan.currency)}</span></div><ul className="flex flex-col gap-1">{plan.instalments.map((item) => <li key={item.id} className="flex items-center justify-between text-sm text-muted-foreground"><span>#{item.sequence} · {formatAmount(item.amountMinor, plan.currency)} due {new Date(item.dueDate).toLocaleDateString('en-GB')}</span><StatusBadge status={item.status} /></li>)}</ul></li>; })}</ul></Panel>}
      <Panel title="Follow-up items" description="Suggested next steps to get the most from your plan.">{followUps.length === 0 ? <EmptyState icon={CalendarClock} title="No follow-up items" description="You're all caught up — new suggestions will appear here." /> : <ul className="flex flex-col divide-y divide-border">{followUps.map((item) => <li key={item.title} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="font-medium text-foreground">{item.title}</p><p className="text-sm text-muted-foreground">{item.detail}</p></div><span className="shrink-0 text-xs text-muted-foreground">{item.when}</span></li>)}</ul>}</Panel>
      <p className="text-sm text-muted-foreground">Demo access is free for testing. Paid plans can be connected to the payment provider later without changing specialist entitlement logic.</p>
    </div>
  );
}