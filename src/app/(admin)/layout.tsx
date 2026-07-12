import * as React from 'react';
import { getSession } from '@/services/auth';
import { requireRole } from '@/lib/auth/authorize';
import { isSupabaseConfigured } from '@/lib/env';
import { AppShell } from '@/components/layout/app-shell';

// Admin reads live data; render on demand, never prerender.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Real RBAC: on the deployed platform enforce the administrator role (redirects
  // unauthenticated → /login and non-admins → /dashboard?denied=1). Locally
  // (no Supabase) fall back to the canned admin persona so the shell still renders.
  const session = isSupabaseConfigured()
    ? await requireRole('administrator', '/admin')
    : await getSession('administrator');
  const userName = session?.user.name ?? 'Admin';

  return (
    <AppShell roleLabel="Admin" userName={userName} navVariant="admin">
      {children}
    </AppShell>
  );
}
