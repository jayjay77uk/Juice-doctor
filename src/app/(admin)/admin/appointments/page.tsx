import type { Metadata } from 'next';
import { CalendarDays, Check } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { appointmentsAdminRepo, type AdminAppointment } from '@/services/repositories/appointments-admin-repo';
import { setAppointmentStatusAction } from '@/services/appointment-admin-actions';
import { consultations } from '@/content/programmes';

export const metadata: Metadata = createMetadata({ title: 'Appointments' });
export const dynamic = 'force-dynamic';

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

function serviceTitle(slug: string): string {
  return consultations.find((c) => c.slug === slug)?.title ?? slug.replaceAll('-', ' ');
}

function StatusForm({ id, status, label, intent }: { id: string; status: string; label: string; intent?: 'outline' | 'ghost' }) {
  return (
    <form action={setAppointmentStatusAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button size="sm" intent={intent ?? 'outline'} type="submit">
        {label}
      </Button>
    </form>
  );
}

export default async function AdminAppointmentsPage() {
  const rows = await appointmentsAdminRepo.list();
  const requested = rows.filter((r) => r.status === 'requested');
  const rest = rows.filter((r) => r.status !== 'requested');

  const columns: Column<AdminAppointment>[] = [
    { header: 'Member', cell: (r) => <span className="font-medium text-foreground">{r.memberName}</span> },
    { header: 'Service', cell: (r) => <span>{serviceTitle(r.serviceSlug)}</span> },
    { header: 'When', cell: (r) => <span className="whitespace-nowrap tabular-nums">{fmt(r.scheduledStart)}</span> },
    { header: 'How', cell: (r) => <span className="capitalize text-muted-foreground">{r.locationType.replaceAll('_', ' ')}</span> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Actions',
      align: 'right',
      cell: (r) => (
        <span className="flex justify-end gap-2">
          {r.status === 'requested' && <StatusForm id={r.id} status="confirmed" label="Confirm" />}
          {r.status === 'confirmed' && <StatusForm id={r.id} status="completed" label="Complete" />}
          {(r.status === 'requested' || r.status === 'confirmed') && <StatusForm id={r.id} status="cancelled" label="Cancel" intent="ghost" />}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Appointments"
        description="Member booking requests and the upcoming schedule. Confirming a request notifies nothing yet — the member sees the status change on their bookings page."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Appointments' }]}
      />

      <Panel title={`Awaiting confirmation — ${requested.length}`} description="New requests from members" padded={false}>
        <DataTable
          columns={columns}
          rows={requested}
          getKey={(r) => r.id}
          empty={<EmptyState icon={Check} title="Nothing awaiting confirmation" description="New booking requests appear here." />}
        />
      </Panel>

      <Panel title="Schedule" description="Confirmed, completed and recent appointments" padded={false}>
        <DataTable
          columns={columns}
          rows={rest}
          getKey={(r) => r.id}
          empty={<EmptyState icon={CalendarDays} title="No appointments yet" description="Confirmed sessions appear here." />}
        />
      </Panel>
    </div>
  );
}
