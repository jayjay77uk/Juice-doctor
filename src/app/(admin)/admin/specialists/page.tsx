import Link from 'next/link';
import { Bot, Users, Banknote, Smile } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { specialists } from '@/services/specialists';
import type { AiAgent } from '@/types/ai';
import type { SpecialistAnalytics } from '@/types/crm';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';

export const metadata = createMetadata({ title: 'Specialist AIs' });

const gbp = (amount: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount / 100);

type SpecialistRow = {
  id: string;
  specialist: AiAgent;
  analytics: SpecialistAnalytics | null;
};

const columns: Column<SpecialistRow>[] = [
  {
    header: 'Specialist',
    cell: (row) => (
      <div className="min-w-0">
        <Link
          href={`/admin/specialists/${row.specialist.id}`}
          className="font-medium text-foreground hover:text-primary"
        >
          {row.specialist.name}
        </Link>
        {row.specialist.product?.tagline && (
          <p className="truncate text-sm text-muted-foreground">{row.specialist.product.tagline}</p>
        )}
      </div>
    ),
  },
  { header: 'Price', cell: (row) => row.specialist.product?.priceLabel ?? '—' },
  {
    header: 'Subscribers',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{row.analytics?.activeSubscribers ?? '—'}</span>,
  },
  {
    header: 'MRR',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{row.analytics ? gbp(row.analytics.mrr) : '—'}</span>,
  },
  { header: 'Status', cell: (row) => <StatusBadge status={row.specialist.status} /> },
];

export default async function SpecialistsPage() {
  const listResult = await specialists.all();
  const list = listResult.ok ? listResult.data : [];

  const rows: SpecialistRow[] = await Promise.all(
    list.map(async (specialist) => {
      const analyticsResult = await specialists.analytics(specialist.slug);
      return {
        id: specialist.id,
        specialist,
        analytics: analyticsResult.ok ? analyticsResult.data : null,
      } satisfies SpecialistRow;
    }),
  );

  const withAnalytics = rows.filter((row): row is SpecialistRow & { analytics: SpecialistAnalytics } =>
    row.analytics !== null,
  );
  const activeSubscribers = withAnalytics.reduce((sum, row) => sum + row.analytics.activeSubscribers, 0);
  const monthlyRecurring = withAnalytics.reduce((sum, row) => sum + row.analytics.mrr, 0);
  const avgSatisfaction =
    withAnalytics.length > 0
      ? withAnalytics.reduce((sum, row) => sum + row.analytics.satisfaction, 0) / withAnalytics.length
      : 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Specialist AIs"
        description="Your AI subscription products — each with its own subscribers, analytics and conversation history."
        breadcrumbs={[{ label: 'Specialist AIs' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/ai/agents/new">New specialist</Link>
          </Button>
        }
      />

      <StatGrid>
        <StatCard label="Specialists" value={list.length} icon={Bot} />
        <StatCard label="Active subscribers" value={activeSubscribers} icon={Users} hint="From real subscriptions" />
        <StatCard label="Monthly recurring" value={gbp(monthlyRecurring)} icon={Banknote} hint="No pricing configured yet" />
        <StatCard label="Avg satisfaction" value={`${Math.round(avgSatisfaction * 100)}%`} icon={Smile} hint="From member ratings" />
      </StatGrid>

      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(row) => row.id}
          empty={
            <EmptyState
              icon={Bot}
              title="No specialists yet"
              description="Create your first Specialist AI to start selling subscription products."
              action={
                <Button asChild size="sm">
                  <Link href="/admin/ai/agents/new">New specialist</Link>
                </Button>
              }
            />
          }
        />
      </Panel>

      <p className="text-sm text-muted-foreground">
        Prototype — mock data through the service layer. No live AI, payments or patient data.
      </p>
    </div>
  );
}
