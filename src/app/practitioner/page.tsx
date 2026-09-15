import Link from 'next/link';
import { AlertTriangle, Stethoscope } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { requireRole } from '@/lib/auth/authorize';
import { consultationsRepo, type ConsultationCase } from '@/services/repositories/consultations-repo';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { hasConsent } from '@/services/consents';

export const metadata = createMetadata({ title: 'Practitioner console' });
export const dynamic = 'force-dynamic';

const fmt = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));

const columns: Column<ConsultationCase>[] = [
  {
    header: 'Member',
    cell: (c) => (
      <Link href={`/practitioner/cases/${c.id}`} className="font-medium text-foreground hover:text-primary">
        {c.memberName}
      </Link>
    ),
  },
  { header: 'Stage', cell: (c) => <StatusBadge status={c.stage} /> },
  { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
  { header: 'Updated', cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{fmt(c.updatedAt)}</span> },
];

export default async function PractitionerConsolePage() {
  const session = await requireRole('practitioner', '/practitioner');
  const all = await consultationsRepo.list();
  const assigned = all.filter((c) => c.practitionerId === session.user.id);
  const permitted = await Promise.all(assigned.map(c => hasConsent(c.memberId, 'health_data_sharing')));
  const cases = assigned.filter((_, index) => permitted[index]);
  const awaiting = cases.filter((c) => c.status === 'awaiting_review');

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <AdminHeader
          title="Practitioner console"
          description="Your assigned member cases, review queue and immutable case history. This console only exposes cases assigned to your account."
          breadcrumbs={[{ label: 'Practitioner' }]}
        />

        <Panel
          title={`Needs review — ${awaiting.length}`}
          description="Assigned cases currently waiting for practitioner review."
          actions={<AlertTriangle className="size-5 text-amber-500" />}
          padded={false}
        >
          {awaiting.length === 0 ? (
            <p className="px-6 py-5 text-sm text-muted-foreground">Nothing is waiting for your review.</p>
          ) : (
            <ul className="divide-y divide-border">
              {awaiting.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <Link href={`/practitioner/cases/${item.id}`} className="font-medium text-foreground hover:text-primary">
                      {item.memberName}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">{item.reason || 'Consultation review'}</p>
                  </div>
                  <StatusBadge status={item.stage} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="My assigned cases" description="Every consultation currently assigned to you." padded={false}>
          <DataTable
            columns={columns}
            rows={cases}
            getKey={(c) => c.id}
            empty={<EmptyState icon={Stethoscope} title="No assigned cases" description="Cases appear here after the team assigns you as practitioner." />}
          />
        </Panel>
      </div>
    </main>
  );
}
