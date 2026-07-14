import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { consultations } from '@/services/consultations';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';

export const metadata: Metadata = createMetadata({ title: 'Consultations' });

// prototype mock
type Case = {
  id: string;
  member: string;
  stage: string;
  practitioner: string;
  status: string;
  updated: string;
};

// prototype mock
const CASES: Case[] = [
  { id: 'case_1', member: 'Customer A', stage: 'assessment', practitioner: 'Practitioner One', status: 'in_progress', updated: '2026-07-09' },
  { id: 'case_2', member: 'Customer B', stage: 'intake', practitioner: 'Unassigned', status: 'awaiting_review', updated: '2026-07-10' },
  { id: 'case_3', member: 'Customer C', stage: 'practitioner_review', practitioner: 'Practitioner One', status: 'in_progress', updated: '2026-07-08' },
  { id: 'case_4', member: 'Customer D', stage: 'follow_up', practitioner: 'Staff One', status: 'completed', updated: '2026-07-05' },
];

// prototype mock
type Escalation = { id: string; member: string; reason: string; since: string };

// prototype mock
const ESCALATIONS: Escalation[] = [
  { id: 'case_2', member: 'Customer B', reason: 'Flagged for review at intake', since: '2h ago' },
];

const labelize = (value: string) => value.replace(/_/g, ' ');

const columns: Column<Case>[] = [
  {
    header: 'Member',
    cell: (c) => (
      <Link href={`/admin/consultations/${c.id}`} className="font-medium text-foreground hover:text-primary">
        {c.member}
      </Link>
    ),
  },
  { header: 'Stage', cell: (c) => <StatusBadge status={c.stage} /> },
  { header: 'Practitioner', cell: (c) => c.practitioner },
  { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
  { header: 'Updated', cell: (c) => c.updated },
];

export default async function ConsultationsPage() {
  const stages = consultations.stages;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Consultations"
        description="The full intake → assessment → review → appointment → follow-up pipeline."
        breadcrumbs={[{ label: 'Consultations' }]}
      />

      <Panel title="Pipeline" description="The linear stage machine every case moves through.">
        <ol className="flex flex-wrap items-center gap-2">
          {stages.map((stage, i) => (
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
        title="Escalation queue"
        description="Cases needing urgent practitioner attention."
        actions={<AlertTriangle className="size-5 text-amber-500" />}
        padded={false}
      >
        <ul className="divide-y divide-border">
          {ESCALATIONS.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-4 border-l-2 border-amber-500 bg-amber-50/50 px-6 py-4">
              <div className="min-w-0">
                <Link href={`/admin/consultations/${e.id}`} className="font-medium text-foreground hover:text-primary">
                  {e.member}
                </Link>
                <p className="truncate text-sm text-muted-foreground">{e.reason}</p>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">{e.since}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Active cases" description="Every case currently in the pipeline." padded={false}>
        <DataTable columns={columns} rows={CASES} getKey={(c) => c.id} />
      </Panel>

      <p className="text-sm text-muted-foreground">
        Prototype — mock data, served through the service layer. AI replies run on the live model (non-production); no real patient data.
      </p>
    </div>
  );
}
