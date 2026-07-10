import * as React from 'react';
import { LayoutDashboard, Users, CalendarDays, FileText, Mic, Inbox } from 'lucide-react';
import { getSession } from '@/services/auth';
import { AppShell, type ShellNavItem } from '@/components/layout/app-shell';

const nav: ShellNavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, active: true },
  { label: 'Clients', href: '/admin', icon: Users },
  { label: 'Bookings', href: '/admin', icon: CalendarDays },
  { label: 'Content', href: '/admin', icon: FileText },
  { label: 'Podcast', href: '/admin', icon: Mic },
  { label: 'Messages', href: '/admin', icon: Inbox },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Production-shaped: a real gate would `requireRole('administrator')`.
  const session = await getSession('administrator');
  const userName = session?.user.name ?? 'Admin';

  return (
    <AppShell roleLabel="Admin" userName={userName} nav={nav}>
      {children}
    </AppShell>
  );
}
