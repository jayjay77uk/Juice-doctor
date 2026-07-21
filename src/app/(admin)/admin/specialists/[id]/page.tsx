import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Users, Banknote, Smile, MessageSquare, FileText, Clock, Gauge } from 'lucide-react';

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
import { agents } from '@/services/agents';
import { knowledge } from '@/services/knowledge';
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

  const [subsResult, analyticsResult, knowledgeResult, versionsResult] = await Promise.all([
    specialists.subscriptions(sp.slug),
    specialists.analytics(sp.slug),
    knowledge.documents.forSpecialist(sp.slug),
    agents.versions(sp.id),
  ]);

  const subscriptions = subsResult.ok ? subsResult.data : [];
  const analytics = analyticsResult.ok ? analyticsResult.data : null;
  const knowledgeDocs = knowledgeResult.ok ? knowledgeResult.data : [];
  const promptVersions = versionsResult.ok ? versionsResult.data : [];

  const memoryItems: { label: string; enabled: boolean }[] = [
    { label: 'Personal memory (per customer)', enabled: sp.memoryConfig.useUserMemory },
    { label: 'Conversation memory', enabled: sp.memoryConfig.useConversationMemory },
    { label: 'Organisation memory', enabled: sp.memoryConfig.useOrganisationMemory },
    { label: 'Global memory', enabled: sp.memoryConfig.useGlobalMemory },
  ];

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
          <StatCard label="Subscribers" value={analytics.subscribers} icon={Users} hint="Coming soon — illustrative" />
          <StatCard label="Active" value={analytics.activeSubscribers} icon={Users} hint="Coming soon — illustrative" />
          <StatCard label="MRR" value={gbp(analytics.mrr)} icon={Banknote} hint="Coming soon — illustrative" />
          <StatCard label="Satisfaction" value={pct(analytics.satisfaction)} icon={Smile} hint="Coming soon — illustrative" />
        </StatGrid>
      )}

      <Panel
        title="Active status"
        description="Whether this specialist is live and available as a subscription product."
        actions={
          <Button asChild size="sm">
            <Link href={`/admin/ai/agents/${sp.id}`}>Edit configuration</Link>
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
            <StatusBadge status={sp.status} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Subscription
            </span>
            <StatusBadge status={sp.subscriptionAvailable ? 'active' : 'off'} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Visibility</span>
            <StatusBadge status={sp.visibility} />
          </div>
        </div>
      </Panel>

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
              <StatGrid>
                <StatCard label="Subscribers" value={analytics.subscribers} icon={Users} />
                <StatCard
                  label="Active subscribers"
                  value={analytics.activeSubscribers}
                  icon={Users}
                />
                <StatCard
                  label="Conversations (30d)"
                  value={analytics.conversations30d}
                  icon={MessageSquare}
                />
                <StatCard label="Satisfaction" value={pct(analytics.satisfaction)} icon={Smile} />
                <StatCard label="Churn rate" value={pct(analytics.churnRate)} icon={Users} />
                <StatCard
                  label="Avg response"
                  value={`${Math.round(analytics.avgResponseMs / 1000)}s`}
                  icon={Gauge}
                />
              </StatGrid>
            ) : (
              <Panel>
                <p className="text-sm text-muted-foreground">Analytics are unavailable.</p>
              </Panel>
            ),
          },
          {
            value: 'knowledge',
            label: 'Knowledge',
            content: (
              <Panel
                title="Knowledge sources"
                description="Documents indexed into this specialist’s knowledge base."
                actions={
                  <Button asChild size="sm" intent="ghost">
                    <Link href="/admin/knowledge">Manage knowledge</Link>
                  </Button>
                }
              >
                {knowledgeDocs.length > 0 ? (
                  <ul className="flex flex-col divide-y divide-border">
                    {knowledgeDocs.map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{d.title}</p>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {d.sourceType}
                          </p>
                        </div>
                        <StatusBadge status={d.indexState} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No knowledge sources"
                    description="Assign documents to this specialist from the knowledge library."
                  />
                )}
              </Panel>
            ),
          },
          {
            value: 'versions',
            label: 'Versions',
            content: (
              <Panel
                title="Prompt versions"
                description="Every published change to this specialist’s configuration."
              >
                {promptVersions.length > 0 ? (
                  <ul className="flex flex-col divide-y divide-border">
                    {promptVersions.map((v) => (
                      <li
                        key={v.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">Version {v.version}</p>
                          <p className="text-xs text-muted-foreground">{v.changeNote}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{v.createdAt}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon={Clock} title="No versions yet" />
                )}
              </Panel>
            ),
          },
          {
            value: 'behaviour',
            label: 'Behaviour',
            content: (
              <div className="grid gap-6 lg:grid-cols-3">
                <Panel title="Memory">
                  <ul className="flex flex-col divide-y divide-border">
                    {memoryItems.map((m) => (
                      <li
                        key={m.label}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <span className="text-sm text-foreground">{m.label}</span>
                        <StatusBadge status={m.enabled ? 'on' : 'off'} />
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Follow-up">
                  <div className="flex flex-col gap-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Enabled</span>
                      <StatusBadge status={sp.followUpConfig.enabled ? 'on' : 'off'} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Cadence</span>
                      <span className="text-foreground">{sp.followUpConfig.cadence}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Message</span>
                      <span className="text-foreground">{sp.followUpConfig.message}</span>
                    </div>
                  </div>
                </Panel>

                <Panel title="Escalation">
                  <div className="flex flex-col gap-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Enabled</span>
                      <StatusBadge status={sp.escalationConfig.enabled ? 'on' : 'off'} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Target</span>
                      <span className="text-foreground">{sp.escalationConfig.target}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Channel</span>
                      <StatusBadge status={sp.escalationConfig.channel} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Note</span>
                      <span className="text-foreground">{sp.escalationConfig.note}</span>
                    </div>
                  </div>
                </Panel>
              </div>
            ),
          },
          {
            value: 'conversations',
            label: 'Conversations & feedback',
            content: (
              <Panel title="Conversations & feedback">
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Conversations and satisfaction feedback for {sp.name} are collected per customer.
                    In the prototype, each customer’s conversation history lives in the member
                    dashboard rather than here.
                  </p>
                  <ComingSoon
                    title="Conversation history"
                    body="Every subscriber conversation with this specialist is stored and searchable in the full platform."
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
