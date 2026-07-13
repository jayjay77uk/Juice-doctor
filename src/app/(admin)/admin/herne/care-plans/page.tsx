import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { listCarePlans, type AdminCarePlan } from '@/services/herne/admin';

export const metadata: Metadata = createMetadata({ title: 'HERNE care plans' });
export const dynamic = 'force-dynamic';

export default async function HerneCarePlansPage() {
  const plans = await listCarePlans(25);

  const columns: Column<AdminCarePlan>[] = [
    { header: 'Person', cell: (p) => <span className="font-mono text-xs text-muted-foreground">{p.userId.slice(0, 8)}…</span> },
    { header: 'Status', cell: (p) => <Badge tone={p.status === 'active' ? 'secondary' : 'outline'}>{p.status}</Badge> },
    {
      header: 'Contributing specialists',
      cell: (p) =>
        p.assignedSpecialists.length ? (
          <span className="flex flex-wrap gap-1">
            {p.assignedSpecialists.map((s) => (
              <Badge key={s} tone="neutral" className="capitalize">{s}</Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { header: 'Goals', align: 'right', cell: (p) => <span className="tabular-nums">{p.goals.length}</span> },
    { header: 'Actions', align: 'right', cell: (p) => <span className="tabular-nums">{p.actionCount}</span> },
    { header: 'Updated', align: 'right', cell: (p) => <span className="text-muted-foreground tabular-nums">{new Date(p.updatedAt).toLocaleDateString('en-GB')}</span> },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <Link href="/admin/herne" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> HERNE Intelligence
        </Link>
        <AdminHeader
          title="Shared care plans"
          description="One plan per person — every specialist reads and updates the same plan, so nobody starts over. Actions are de-duplicated across specialists. Read-only; plans are maintained by the runtime."
        />
      </div>

      <Panel title={`Care plans — ${plans.length}`} description="Most recently updated first" padded={false}>
        <DataTable
          columns={columns}
          rows={plans}
          getKey={(p) => p.id}
          empty={<EmptyState icon={ClipboardList} title="No care plans yet" description="A shared care plan is created the first time a specialist files a recommendation for a person." />}
        />
      </Panel>

      <p className="rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
        Person identifiers are shown truncated for privacy. There is exactly one active plan per person (enforced by a partial-unique index).
      </p>
    </div>
  );
}
