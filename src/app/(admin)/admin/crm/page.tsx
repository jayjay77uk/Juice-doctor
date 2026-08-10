import Link from 'next/link';
import { ContactRound, ShieldAlert } from 'lucide-react';

import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { CrmFilters } from '@/components/admin/crm-filters';
import { crm } from '@/services/crm';
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER, type CrmLead, type LeadStatus } from '@/types/crm';

export const metadata = createMetadata({ title: 'CRM · Leads' });

function humanise(status: string): string {
  const words = status.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const columns: Column<CrmLead>[] = [
  {
    header: 'Lead',
    cell: (lead) => (
      <div className="flex flex-col">
        <Link href={`/admin/crm/${lead.id}`} className="font-medium text-foreground hover:underline">
          {lead.name}
        </Link>
        <span className="text-xs text-muted-foreground">{lead.email}</span>
      </div>
    ),
  },
  {
    header: 'Recommended',
    cell: (lead) => lead.recommendedSpecialistName ?? 'Escalated to human',
  },
  {
    header: 'Confidence',
    cell: (lead) => {
      const pct = Math.round(lead.recommendationConfidence * 100);
      return (
        <div className="flex items-center gap-2">
          <span className="h-2 w-16 overflow-hidden rounded-full bg-surface-muted">
            <span className="block h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      );
    },
  },
  {
    header: 'Status',
    cell: (lead) => <StatusBadge status={LEAD_STATUS_LABELS[lead.status]} />,
  },
  {
    header: 'Follow-up',
    cell: (lead) => <StatusBadge status={lead.followUpStatus} />,
  },
  {
    header: 'Progress',
    align: 'right',
    cell: (lead) => <span className="tabular-nums">{lead.progress}%</span>,
  },
];

export default async function CrmLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const search = q?.trim() ?? '';
  const statusFilter =
    status && LEAD_STATUS_ORDER.includes(status as LeadStatus) ? (status as LeadStatus) : undefined;

  const listFilter: { search?: string; status?: LeadStatus } = {};
  if (search) listFilter.search = search;
  if (statusFilter) listFilter.status = statusFilter;

  const [leadsResult, pipelineResult, escalationResult, remindersResult] = await Promise.all([
    crm.list(listFilter),
    crm.pipeline(),
    crm.escalationQueue(),
    crm.dueReminders(),
  ]);
  const dueReminders = remindersResult.ok ? remindersResult.data : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="CRM · Leads"
        description="Every lead the Receptionist AI creates — its assessment, recommendation confidence, assigned specialist and follow-up."
      />

      <CrmFilters q={search} status={statusFilter ?? ''} />

      {dueReminders.length > 0 && (
        <Panel
          title={`Follow-ups due (${dueReminders.length})`}
          description="Leads whose reminder date has arrived and whose follow-up is not yet done."
          padded={false}
        >
          <ul className="divide-y divide-border">
            {dueReminders.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                <div className="min-w-0">
                  <Link href={`/admin/crm/${lead.id}`} className="font-medium text-foreground hover:underline">
                    {lead.name}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">{lead.email}</p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-warning">
                  Due {lead.reminderAt ? new Date(lead.reminderAt).toLocaleDateString('en-GB') : ''}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Pipeline">
        {pipelineResult.ok ? (
          <div className="flex flex-wrap gap-3">
            {pipelineResult.data.map((entry) => (
              <div
                key={entry.status}
                className="flex min-w-28 flex-col gap-1 rounded-xl border border-border bg-surface-muted/40 px-4 py-3"
              >
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {humanise(entry.status)}
                </span>
                <span className="font-serif text-2xl text-foreground">{entry.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{pipelineResult.error.message}</p>
        )}
      </Panel>

      <Panel title="Escalation queue" padded={false}>
        {escalationResult.ok ? (
          escalationResult.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {escalationResult.data.map((lead) => (
                <li key={lead.id} className="bg-amber-50/40">
                  <Link
                    href={`/admin/crm/${lead.id}`}
                    className="flex flex-col gap-1 px-6 py-4 transition-colors hover:bg-amber-50/70"
                  >
                    <span className="font-medium text-foreground">{lead.name}</span>
                    <span className="text-sm text-muted-foreground">{lead.assessmentSummary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={ShieldAlert}
                title="Nothing escalated"
                description="The Receptionist AI is handling every lead within confidence. Escalations appear here for human review."
              />
            </div>
          )
        ) : (
          <p className="p-6 text-sm text-muted-foreground">{escalationResult.error.message}</p>
        )}
      </Panel>

      <Panel title="All leads" padded={false}>
        {leadsResult.ok ? (
          <DataTable
            columns={columns}
            rows={leadsResult.data}
            getKey={(lead) => lead.id}
            empty={
              <EmptyState
                icon={ContactRound}
                title="No leads yet"
                description="Leads created by the Receptionist AI will appear here."
              />
            }
          />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">{leadsResult.error.message}</p>
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">
        Live data from the platform database. No payment provider is connected.
      </p>
    </div>
  );
}
