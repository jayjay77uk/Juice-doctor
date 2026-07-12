import * as React from 'react';
import { getSession } from '@/services/auth';
import { isAdminRole } from '@/lib/auth/roles';
import { AppShell } from '@/components/layout/app-shell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession('member');
  const userName = session?.user.name ?? 'Member';
  // Let an administrator who lands on the member area cross-navigate to /admin.
  const adminHref = session && isAdminRole(session.user.role) ? '/admin' : undefined;

  return (
    <AppShell roleLabel="Member area" userName={userName} navVariant="dashboard" adminHref={adminHref}>
      {children}
    </AppShell>
  );
}
