import * as React from 'react';
import { requireRole } from '@/lib/auth/authorize';
import { AppShell } from '@/components/layout/app-shell';

// Admin reads live data; render on demand, never prerender.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Real RBAC, always: unauthenticated → /login, non-admins → /dashboard?denied=1.
  // There is no persona fallback — without a real administrator session the
  // admin area is simply not reachable.
  const session = await requireRole('administrator', '/admin');
  const userName = session?.user.name ?? 'Admin';

  return (
    <AppShell roleLabel="Admin" userName={userName} navVariant="admin">
      {children}
    </AppShell>
  );
}
