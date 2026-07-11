import { CreditCard, CalendarClock } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { SubscriptionControls } from '@/components/dashboard/subscription-controls';
import { member } from '@/services/member';
import { subscriptionsService } from '@/services/subscriptions';
import { specialists } from '@/services/specialists';

export const metadata = createMetadata({ title: 'My subscriptions' });

const SCOPE_LABEL: Record<string, string> = {
  single: 'Single specialist',
  multiple: 'Selected specialists',
  all: 'All-access',
};

export default async function MySubscriptionsPage() {
  const [subsResult, plansResult, followUpsResult, specialistsResult] = await Promise.all([
    member.mySubscriptions(),
    subscriptionsService.plans.list(),
    member.myFollowUps(),
    specialists.all(),
  ]);

  const subscriptions = subsResult.ok ? subsResult.data : [];
  const plans = plansResult.ok ? plansResult.data : [];
  const followUps = followUpsResult.ok ? followUpsResult.data : [];
  const specialistNames = new Map(
    (specialistsResult.ok ? specialistsResult.data : []).map((s) => [s.slug, s.name]),
  );

  const planOptions = plans.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader title="My subscriptions" description="Manage the specialist AI plans you're subscribed to." />

      {subscriptions.length === 0 ? (
        <Panel title="No subscriptions yet">
          <EmptyState
            icon={CreditCard}
            title="You have no active subscriptions"
            description="Once you subscribe to a plan, it appears here so you can change, upgrade or cancel it."
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-5">
          {subscriptions.map((sub) => {
            const covered =
              sub.scope === 'all'
                ? ['Every available specialist AI']
                : sub.specialistSlugs.map((slug) => specialistNames.get(slug) ?? slug);
            return (
              <Panel
                key={sub.id}
                title={sub.planName}
                description={SCOPE_LABEL[sub.scope] ?? sub.scope}
                actions={<StatusBadge status={sub.state} />}
              >
                <div className="flex flex-col gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-muted-foreground">Access scope</p>
                      <StatusBadge status={sub.scope} tone="teal" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-muted-foreground">Covered specialists</p>
                      <div className="flex flex-wrap gap-2">
                        {covered.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-1 text-xs text-foreground"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-muted-foreground">Started</p>
                      <p className="text-sm text-foreground">{sub.startedAt || '—'}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-muted-foreground">Last payment</p>
                      <p className="text-sm text-foreground">{sub.lastPaymentAt ?? '—'}</p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-5">
                    <SubscriptionControls
                      subscriptionId={sub.id}
                      plans={planOptions}
                      currentPlanId={sub.planId}
                    />
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Panel title="Follow-up items" description="Suggested next steps to get the most from your plan.">
        {followUps.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No follow-up items"
            description="You're all caught up — new suggestions will appear here."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {followUps.map((item) => (
              <li key={item.title} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{item.when}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">Prototype — no live payment provider is connected.</p>
    </div>
  );
}
