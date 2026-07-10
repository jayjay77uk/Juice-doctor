import * as React from 'react';
import { getSession } from '@/services/auth';
import { AppShell } from '@/components/layout/app-shell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession('member');
  const userName = session?.user.name ?? 'Member';

  return (
    <AppShell roleLabel="Member area" userName={userName} navVariant="dashboard">
      {children}
    </AppShell>
  );
}
