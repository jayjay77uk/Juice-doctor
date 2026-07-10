import * as React from 'react';
import { LayoutDashboard, CalendarDays, ClipboardList, MessageCircle, Settings } from 'lucide-react';
import { getSession } from '@/services/auth';
import { AppShell, type ShellNavItem } from '@/components/layout/app-shell';

const nav: ShellNavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, active: true },
  { label: 'My programme', href: '/dashboard', icon: ClipboardList },
  { label: 'Bookings', href: '/dashboard', icon: CalendarDays },
  { label: 'Messages', href: '/dashboard', icon: MessageCircle },
  { label: 'Settings', href: '/dashboard', icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Production-shaped: a real gate would `redirect('/login')` when session is null.
  const session = await getSession('member');
  const userName = session?.user.name ?? 'Member';

  return (
    <AppShell roleLabel="Member area" userName={userName} nav={nav}>
      {children}
    </AppShell>
  );
}
