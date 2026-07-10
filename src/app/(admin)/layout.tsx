import * as React from 'react';
import { getSession } from '@/services/auth';
import { AppShell } from '@/components/layout/app-shell';

// Admin reads mutable in-process mock stores; render on demand, never prerender.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Production-shaped: a real gate would `requireRole('administrator')`.
  const session = await getSession('administrator');
  const userName = session?.user.name ?? 'Admin';

  return (
    <AppShell roleLabel="Admin" userName={userName} navVariant="admin">
      {children}
    </AppShell>
  );
}
