import type { Metadata } from 'next';
import { ScrollText, ShieldCheck } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { audit } from '@/services/platform';
import { auditRepo } from '@/services/repositories/audit-repo';
import { admin } from '@/services/admin';
import { isSupabaseAdminConfigured } from '@/lib/env';
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
  { id: 'a1', actor: 'Admin User', action: 'agent.published', entity: 'Makela', at: '10 Jul, 14:22' },
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

const formatWhen = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default async function AuditLogsPage() {
  let rows: AuditRow[];
  if (isSupabaseAdminConfigured()) {
    // PRODUCTION: the real append-only audit_logs table, actor ids resolved to names.
    const [entries, usersResult] = await Promise.all([auditRepo.recent(50), admin.users.list()]);
    const names = new Map(
      (usersResult.ok ? usersResult.data.items : []).map((u) => [u.id, u.fullName || u.displayName || u.email || 'User']),
    );
    rows = entries.map((e) => ({
      id: e.id,
      actor: (e.actorId && names.get(e.actorId)) || 'System',
      action: e.action,
      entity: String(e.after?.label ?? e.entityId ?? e.entityType),
      at: formatWhen(e.createdAt),
    }));
  } else {
    const result = await audit.list();
    const logged = result.ok ? result.data.items : [];
    rows = logged.length > 0
      ? logged.map((entry) => ({
          id: entry.id,
          actor: entry.actorId ?? 'System',
          action: entry.action,
          entity: entry.entityId ?? entry.entityType,
          at: entry.createdAt,
        }))
      : ENTRIES;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Audit Logs"
        description="An append-only record of every significant action. Immutable by design."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit Logs' }]}
      />

      <Panel padded={false}>
        {rows.length > 0 ? (
          <DataTable columns={columns} rows={rows} getKey={(row) => row.id} />
        ) : (
          <p className="px-6 py-8 text-sm text-muted-foreground">No audit entries yet — admin actions appear here as they happen.</p>
        )}
      </Panel>

      <p className="flex items-start gap-2 rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          This reads the append-only <code className="font-mono text-xs">audit_logs</code> table — inserts only, so
          history can never be rewritten.
        </span>
      </p>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ScrollText className="size-4 shrink-0" />
        Admin actions (agent changes, flag toggles, prompt publishing, receptionist settings) are recorded here automatically.
      </p>
    </div>
  );
}
