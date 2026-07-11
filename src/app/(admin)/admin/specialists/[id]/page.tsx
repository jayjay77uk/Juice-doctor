import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Users, Banknote, Smile, MessageSquare } from 'lucide-react';

import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { Tabs } from '@/components/admin/tabs';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/sections/coming-soon';
import { specialists } from '@/services/specialists';
import type { SpecialistSubscription } from '@/types/crm';

export const metadata = createMetadata({ title: 'Specialist AI' });

const gbp = (amount: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount / 100);

const pct = (value: number) => `${Math.round(value * 100)}%`;

export default async function SpecialistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const spResult = await specialists.byId(id);
  if (!spResult.ok) notFound();
  const sp = spResult.data;

  const [subsResult, analyticsResult] = await Promise.all([
    specialists.subscriptions(sp.slug),
    specialists.analytics(sp.slug),
  ]);

  const subscriptions = subsResult.ok ? subsResult.data : [];
  const analytics = analyticsResult.ok ? analyticsResult.data : null;

  const subscriberColumns: Column<SpecialistSubscription>[] = [
    {
      header: 'Customer',
      cell: (s) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{s.customerName}</p>
          <p className="text-xs text-muted-foreground">{s.customerEmail}</p>
        </div>
      ),
    },
    { header: 'Plan', cell: (s) => s.plan },
    { header: 'Status', cell: (s) => <StatusBadge status={s.state} /> },
    { header: 'MRR', align: 'right', cell: (s) => <span className="tabular-nums">{gbp(s.mrr)}</span> },
    { header: 'Since', cell: (s) => s.startedAt },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title={sp.name}
        breadcrumbs={[
          { label: 'Specialists', href: '/admin/specialists' },
          { label: sp.name },
        ]}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={sp.status} />
            <Button asChild size="sm">
              <Link href={`/admin/ai/agents/${sp.id}`}>Edit config</Link>
            </Button>
          </div>
        }
      />

      {analytics && (
        <StatGrid>
          <StatCard label="Subscribers" value={analytics.subscribers} icon={Users} />
          <StatCard label="Active" value={analytics.activeSubscribers} icon={Users} />
          <StatCard label="MRR" value={gbp(analytics.mrr)} icon={Banknote} />
          <StatCard label="Satisfaction" value={pct(analytics.satisfaction)} icon={Smile} />
        </StatGrid>
      )}

      <Tabs
        tabs={[
          {
            value: 'overview',
            label: 'Overview',
            content: (
              <Panel title="About this specialist">
                <div className="flex flex-col gap-6">
                  <p className="max-w-2xl text-muted-foreground">{sp.description}</p>

                  {sp.product && (
                    <div className="flex flex-col gap-3">
                      {sp.product.tagline && (
                        <p className="text-sm font-medium text-foreground">{sp.product.tagline}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-foreground">
                          {sp.product.priceLabel}
                        </span>
                        {sp.product.expertise.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 border-t border-border pt-6">
                    <div>
                      <p className="text-sm font-medium text-foreground">Manage its capabilities</p>
                      <p className="text-sm text-muted-foreground">
                        Each specialist reuses these shared modules — prompts, knowledge, memory and
                        safety are configured once and applied to every agent.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm">
                        <Link href="/admin/ai/prompts">Prompts</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href="/admin/knowledge">Knowledge</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href="/admin/ai/memory">Memory</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href="/admin/ai/safety">Safety</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            ),
          },
          {
            value: 'subscribers',
            label: 'Subscribers',
            content: (
              <Panel padded={false}>
                <DataTable
                  columns={subscriberColumns}
                  rows={subscriptions}
                  getKey={(s) => s.id}
                  empty={<EmptyState icon={Users} title="No subscribers yet" />}
                />
              </Panel>
            ),
          },
          {
            value: 'analytics',
            label: 'Analytics',
            content: analytics ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Conversations (30d)"
                  value={analytics.conversations30d}
                  icon={MessageSquare}
                />
                <StatCard label="Churn rate" value={pct(analytics.churnRate)} icon={Users} />
                <StatCard
                  label="Avg response"
                  value={`${Math.round(analytics.avgResponseMs)} ms`}
                  icon={MessageSquare}
                />
                <StatCard label="Satisfaction" value={pct(analytics.satisfaction)} icon={Smile} />
              </div>
            ) : (
              <Panel>
                <p className="text-sm text-muted-foreground">Analytics are unavailable.</p>
              </Panel>
            ),
          },
          {
            value: 'conversations',
            label: 'Conversations',
            content: (
              <Panel>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    A searchable history of every subscriber conversation with {sp.name}.
                  </p>
                  <ComingSoon
                    title="Conversation history"
                    body="Every subscriber conversation with this specialist is stored and searchable in the full platform. No AI runs in this prototype."
                  />
                </div>
              </Panel>
            ),
          },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        Prototype — mock data through the service layer. No live AI, payments or patient data.
      </p>
    </div>
  );
}
