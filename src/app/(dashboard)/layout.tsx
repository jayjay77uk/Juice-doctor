import * as React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/services/auth';
import { isAdminRole } from '@/lib/auth/roles';
import { AppShell } from '@/components/layout/app-shell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // No session, no dashboard — defence in depth alongside the middleware gate.
  if (!session) redirect('/login?next=%2Fdashboard');
  const userName = session.user.name;
  // Let an administrator who lands on the member area cross-navigate to /admin.
  const adminHref = isAdminRole(session.user.role) ? '/admin' : undefined;

  return (
    <AppShell roleLabel="Member area" userName={userName} navVariant="dashboard" adminHref={adminHref}>
      {children}
    </AppShell>
  );
}
