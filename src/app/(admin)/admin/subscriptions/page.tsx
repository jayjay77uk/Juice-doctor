import { Layers, CreditCard, Users } from 'lucide-react';

import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { CreatePlanForm } from '@/components/admin/create-plan-form';
import { SubscriptionRowActions } from '@/components/admin/subscription-row-actions';
import { archivePlanAction } from '@/services/subscription-actions';
import { subscriptionsService } from '@/services/subscriptions';
import { specialists } from '@/services/specialists';
import type { CustomerSubscription } from '@/types/crm';

export const metadata = createMetadata({ title: 'Subscriptions' });

const SCOPE_LABEL: Record<string, string> = {
  single: 'Single specialist',
  multiple: 'Selected specialists',
  all: 'All specialists',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return value.slice(0, 10);
}

export default async function AdminSubscriptionsPage() {
  const [plansResult, subsResult, summaryResult, specialistsResult] = await Promise.all([
    subscriptionsService.plans.all(),
    subscriptionsService.list(),
    subscriptionsService.summary(),
    specialists.all(),
  ]);

  const plans = plansResult.ok ? plansResult.data : [];
  const summary = summaryResult.ok
    ? summaryResult.data
    : { total: 0, active: 0, trialing: 0, pastDue: 0, canceled: 0 };
  const specialistOptions = specialistsResult.ok
    ? specialistsResult.data.map((s) => ({ slug: s.slug, name: s.name }))
    : [];
  const planOptions = plans
    .filter((p) => p.status === 'active')
    .map((p) => ({ id: p.id, name: p.name }));

  const columns: Column<CustomerSubscription>[] = [
    {
      header: 'Customer',
      cell: (sub) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{sub.customerName}</span>
          <span className="text-xs text-muted-foreground">{sub.customerEmail}</span>
        </div>
      ),
    },
    { header: 'Plan', cell: (sub) => sub.planName },
    { header: 'Scope', cell: (sub) => <StatusBadge status={sub.scope} /> },
    { header: 'State', cell: (sub) => <StatusBadge status={sub.state} /> },
    { header: 'Started', cell: (sub) => formatDate(sub.startedAt) },
    { header: 'Last payment', cell: (sub) => formatDate(sub.lastPaymentAt) },
    {
      header: 'Manage',
      cell: (sub) => (
        <SubscriptionRowActions subscriptionId={sub.id} plans={planOptions} state={sub.state} />
      ),
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Subscriptions"
        description="Configure access plans and manage every customer subscription. Plans are keyed by access scope — pricing is configurable later."
      />

      <StatGrid>
        <StatCard label="Total subscriptions" value={summary.total} icon={Layers} />
        <StatCard label="Active" value={summary.active} icon={Users} />
        <StatCard label="Trialing" value={summary.trialing} />
        <StatCard label="Past due / incomplete" value={summary.pastDue} icon={CreditCard} />
      </StatGrid>

      <Panel
        title="Plans"
        description="Access plans grant one, several or all specialists. New plans show “Price on request” until pricing is configured."
        padded={false}
      >
        {plans.length > 0 ? (
          <ul className="divide-y divide-border">
            {plans.map((plan) => (
              <li key={plan.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{plan.name}</span>
                    <StatusBadge status={plan.scope} />
                    {plan.status === 'archived' && <StatusBadge status="archived" />}
                  </div>
                  {plan.description && (
                    <span className="text-sm text-muted-foreground">{plan.description}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {plan.scope === 'all'
                      ? 'All specialists'
                      : plan.specialistSlugs.length > 0
                        ? plan.specialistSlugs.join(', ')
                        : 'No specialists selected'}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm text-muted-foreground">{plan.priceLabel}</span>
                  {plan.status === 'active' && (
                    <form action={archivePlanAction}>
                      <input type="hidden" name="id" value={plan.id} />
                      <Button type="submit" size="sm" intent="ghost">
                        Archive
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={Layers}
              title="No plans yet"
              description="Create an access plan below to start subscribing customers."
            />
          </div>
        )}
        <div className="border-t border-border p-5 sm:p-6">
          <h3 className="mb-4 font-serif text-base text-foreground">Create a plan</h3>
          <CreatePlanForm specialists={specialistOptions} />
        </div>
      </Panel>

      <Panel title="Customer subscriptions" padded={false}>
        {subsResult.ok ? (
          <DataTable
            columns={columns}
            rows={subsResult.data}
            getKey={(sub) => sub.id}
            empty={
              <EmptyState
                icon={Users}
                title="No subscriptions yet"
                description="Customer subscriptions appear here once customers subscribe to a plan."
              />
            }
          />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">{subsResult.error.message}</p>
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">
        No payment provider is connected — payments are recorded manually. Plans and subscriptions are live platform data.
      </p>
    </div>
  );
}
