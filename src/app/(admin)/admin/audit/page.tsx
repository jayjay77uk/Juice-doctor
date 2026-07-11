import type { Metadata } from 'next';
import { ScrollText, ShieldCheck } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { audit } from '@/services/platform';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';

export const metadata: Metadata = createMetadata({ title: 'Audit Logs' });

interface AuditRow {
  id: string;
  actor: string;
  action: string;
  entity: string;
  at: string;
}

// prototype mock — the append-only audit trail is empty in the prototype.
const ENTRIES: AuditRow[] = [
  { id: 'a1', actor: 'Admin User', action: 'agent.published', entity: 'Assistant AI', at: '10 Jul, 14:22' },
  { id: 'a2', actor: 'Staff One', action: 'knowledge.document.approved', entity: 'Getting Started Guide', at: '10 Jul, 11:05' },
  { id: 'a3', actor: 'Admin User', action: 'feature_flag.toggled', entity: 'ai.chat', at: '9 Jul, 16:40' },
  { id: 'a4', actor: 'System', action: 'prompt.version.published', entity: 'System prompt · Intake & Triage', at: '9 Jul, 09:15' },
  { id: 'a5', actor: 'Practitioner One', action: 'consultation.note.added', entity: 'Case · Customer A', at: '7 Jul, 10:03' },
];

const columns: Column<AuditRow>[] = [
  {
    header: 'Actor',
    cell: (row) => <span className="font-semibold text-foreground">{row.actor}</span>,
  },
  {
    header: 'Action',
    cell: (row) => (
      <span className="rounded bg-surface-muted px-2 py-0.5 font-mono text-xs text-foreground">{row.action}</span>
    ),
  },
  {
    header: 'Entity',
    cell: (row) => <span className="text-muted-foreground">{row.entity}</span>,
  },
  {
    header: 'When',
    align: 'right',
    cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{row.at}</span>,
  },
];

export default async function AuditLogsPage() {
  const result = await audit.list();
  const logged = result.ok ? result.data.items : [];
  // The service layer is wired but returns no rows in the prototype; fall back
  // to the mock trail so the operational view is populated.
  const rows: AuditRow[] = logged.length > 0
    ? logged.map((entry) => ({
        id: entry.id,
        actor: entry.actorId ?? 'System',
        action: entry.action,
        entity: entry.entityId ?? entry.entityType,
        at: entry.createdAt,
      }))
    : ENTRIES;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Audit Logs"
        description="An append-only record of every significant action. Immutable by design."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit Logs' }]}
      />

      <Panel padded={false}>
        <DataTable columns={columns} rows={rows} getKey={(row) => row.id} />
      </Panel>

      <p className="flex items-start gap-2 rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          In production this reads the append-only <code className="font-mono text-xs">audit_logs</code> table — inserts
          only, with no <code className="font-mono text-xs">UPDATE</code> or <code className="font-mono text-xs">DELETE</code> grants, so history can never be rewritten.
        </span>
      </p>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ScrollText className="size-4 shrink-0" />
        Prototype — mock data, served through the service layer. No production AI or user data.
      </p>
    </div>
  );
}
