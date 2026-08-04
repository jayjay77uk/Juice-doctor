import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Stethoscope } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { consultationsRepo, type ConsultationCase } from '@/services/repositories/consultations-repo';

export const metadata: Metadata = createMetadata({ title: 'Consultations' });
export const dynamic = 'force-dynamic';

const STAGES = ['intake', 'assessment', 'ai_review', 'practitioner_review', 'appointment', 'follow_up', 'history'];

const labelize = (value: string) => value.replace(/_/g, ' ');
const fmt = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));

const columns: Column<ConsultationCase>[] = [
  {
    header: 'Member',
    cell: (c) => (
      <Link href={`/admin/consultations/${c.id}`} className="font-medium text-foreground hover:text-primary">
        {c.memberName}
      </Link>
    ),
  },
  { header: 'Stage', cell: (c) => <StatusBadge status={c.stage} /> },
  { header: 'Practitioner', cell: (c) => c.practitionerName },
  { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
  { header: 'Updated', cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{fmt(c.updatedAt)}</span> },
];

export default async function ConsultationsPage() {
  const cases = await consultationsRepo.list();
  const escalations = cases.filter((c) => c.status === 'awaiting_review');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Consultations"
        description="Every case in the consultation workflow — read from the live database. Notes and review decisions are recorded as immutable events."
        breadcrumbs={[{ label: 'Consultations' }]}
      />

      <Panel title="Pipeline" description="The linear stage machine every case moves through.">
        <ol className="flex flex-wrap items-center gap-2">
          {STAGES.map((stage, i) => (
            <li
              key={stage}
              className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-sm capitalize text-foreground"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-background text-xs font-medium text-muted-foreground">
                {i + 1}
              </span>
              {labelize(stage)}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        title={`Awaiting review — ${escalations.length}`}
        description="Cases needing practitioner attention."
        actions={<AlertTriangle className="size-5 text-amber-500" />}
        padded={false}
      >
        {escalations.length === 0 ? (
          <p className="px-6 py-5 text-sm text-muted-foreground">Nothing is waiting for review right now.</p>
        ) : (
          <ul className="divide-y divide-border">
            {escalations.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 border-l-2 border-amber-500 bg-amber-50/50 px-6 py-4">
                <div className="min-w-0">
                  <Link href={`/admin/consultations/${e.id}`} className="font-medium text-foreground hover:text-primary">
                    {e.memberName}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">{e.reason}</p>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">{fmt(e.updatedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="All cases" description="Every case in the workflow, newest first." padded={false}>
        <DataTable
          columns={columns}
          rows={cases}
          getKey={(c) => c.id}
          empty={<EmptyState icon={Stethoscope} title="No consultations yet" description="Cases appear here as members book and complete intake." />}
        />
      </Panel>

      <p className="text-sm text-muted-foreground">
        Live data. Demo cases are fictional and clearly marked in their AI review.
      </p>
    </div>
  );
}
