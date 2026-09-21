import type { Metadata } from 'next';
import { Users, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { InviteUserForm } from '@/components/admin/invite-user-form';
import { admin } from '@/services/admin';
import type { Profile } from '@/types/identity';
import { requirePermission } from '@/lib/auth/authorize';
import { mayManageUser } from '@/lib/auth/user-management';
import { UserAccessForm } from '@/components/admin/user-access-form';

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
  { header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
  {
    header: 'Onboarding',
    cell: (u) => <StatusBadge status={u.onboardingCompleted ? 'completed' : 'pending'} />,
  },
  { header: 'Joined', cell: (u) => u.createdAt.slice(0, 10) },
  { header: 'Last seen', cell: (u) => u.lastSeenAt?.slice(0, 10) ?? '—' },
];

export default async function UsersPage() {
  const { user } = await requirePermission('users.read', '/admin/users');
  const result = await admin.users.list({}, user.organisationId ?? '00000000-0000-0000-0000-000000000000');
  const items = result.ok ? result.data.items : [];
  const loadError = result.ok ? null : result.error.message;

  const members = items.filter((u) => u.role === 'member').length;
  const practitioners = items.filter((u) => u.role === 'practitioner').length;
  const staff = items.filter((u) => STAFF_ROLES.has(u.role)).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Users"
        description="Manage members, practitioners and staff."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}
        actions={<InviteUserForm />}
      />

      {loadError && (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {loadError} The figures below are unavailable — this is a loading problem, not an empty platform.
        </p>
      )}

      <StatGrid>
        <StatCard label="Total users" value={loadError ? '—' : items.length} icon={Users} />
        <StatCard label="Members" value={loadError ? '—' : members} icon={User} />
        <StatCard label="Practitioners" value={loadError ? '—' : practitioners} icon={Stethoscope} />
        <StatCard label="Staff+" value={loadError ? '—' : staff} icon={ShieldCheck} />
      </StatGrid>

      <Panel padded={false}>
        <DataTable
          columns={[...columns, { header: 'Access', cell: (profile) => mayManageUser(user, profile, profile.role)
            ? <UserAccessForm profile={profile} actorRole={user.role} /> : <span className="text-muted-foreground">Protected</span> }]}
          rows={items}
          getKey={(u) => u.id}
          empty={
            loadError ? (
              <EmptyState icon={Users} title="Users could not be loaded" description={loadError} />
            ) : (
              <EmptyState
                icon={Users}
                title="No users yet"
                description="Invited members, practitioners and staff will appear here."
              />
            )
          }
        />
      </Panel>

      <p className="text-sm text-muted-foreground">
        Live data from the platform database — real user accounts.
      </p>
    </div>
  );
}
