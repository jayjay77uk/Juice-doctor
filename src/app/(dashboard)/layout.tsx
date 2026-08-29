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
  // Practitioners land on the member area after login — give them a visible
  // path to their case-review console (RBAC still enforced on the route).
  const practitionerHref = session.user.role === 'practitioner' ? '/practitioner' : undefined;

  return (
    <AppShell roleLabel="Member area" userName={userName} navVariant="dashboard" adminHref={adminHref} practitionerHref={practitionerHref}>
      {children}
    </AppShell>
  );
}
