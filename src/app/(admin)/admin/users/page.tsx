import type { Metadata } from 'next';
import { Users, UserPlus, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { admin } from '@/services/admin';
import type { Profile } from '@/types/identity';

export const metadata: Metadata = createMetadata({
  title: 'Users',
  description: 'Manage members, practitioners and staff.',
  path: '/admin/users',
});

const STAFF_ROLES = new Set(['staff', 'administrator', 'super_administrator']);

const columns: Column<Profile>[] = [
  {
    header: 'Name',
    cell: (u) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{u.fullName ?? '—'}</p>
        {u.email ? <p className="truncate font-mono text-xs text-muted-foreground">{u.email}</p> : null}
      </div>
    ),
  },
  { header: 'Role', cell: (u) => <StatusBadge status={u.role} /> },
  {
    header: 'Onboarding',
    cell: (u) => <StatusBadge status={u.onboardingCompleted ? 'completed' : 'pending'} />,
  },
  { header: 'Joined', cell: (u) => u.createdAt.slice(0, 10) },
  { header: 'Last seen', cell: (u) => u.lastSeenAt?.slice(0, 10) ?? '—' },
];

export default async function UsersPage() {
  const result = await admin.users.list();
  const items = result.ok ? result.data.items : [];

  const members = items.filter((u) => u.role === 'member').length;
  const practitioners = items.filter((u) => u.role === 'practitioner').length;
  const staff = items.filter((u) => STAFF_ROLES.has(u.role)).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Users"
        description="Manage members, practitioners and staff."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}
        actions={
          <Button size="sm">
            <UserPlus className="size-4" /> Invite user
          </Button>
        }
      />

      <StatGrid>
        <StatCard label="Total users" value={items.length} icon={Users} />
        <StatCard label="Members" value={members} icon={User} />
        <StatCard label="Practitioners" value={practitioners} icon={Stethoscope} />
        <StatCard label="Staff+" value={staff} icon={ShieldCheck} />
      </StatGrid>

      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={items}
          getKey={(u) => u.id}
          empty={
            <EmptyState
              icon={Users}
              title="No users yet"
              description="Invited members, practitioners and staff will appear here."
            />
          }
        />
      </Panel>

      <p className="text-sm text-muted-foreground">
        Prototype — mock data, served through the service layer. No production AI or patient data.
      </p>
    </div>
  );
}
