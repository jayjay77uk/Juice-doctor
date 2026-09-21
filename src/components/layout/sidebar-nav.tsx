'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  Activity,
  Bot,
  MessageSquareText,
  FlaskConical,
  ShieldCheck,
  Brain,
  BarChart3,
  BookOpen,
  Users,
  Stethoscope,
  Settings2,
  ScrollText,
  Wrench,
  ContactRound,
  Target,
  HeartPulse,
  CalendarDays,
  ClipboardList,
  Route,
  MessageCircle,
  Bell,
  Settings,
  CreditCard,
  LifeBuoy,
  GitBranch,
  Watch,
  Inbox,
  Plug,
  Banknote,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ShellNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface ShellNavSection {
  title?: string;
  items: ShellNavItem[];
}

export type NavVariant = 'admin' | 'dashboard';

/**
 * Nav configuration lives HERE (a client module) so the lucide icon components
 * are never passed across the server→client boundary — the server layout passes
 * only a `variant` string, which is serialisable.
 */
const NAV: Record<NavVariant, ShellNavSection[]> = {
  admin: [
    { title: 'Business', items: [{ label: 'Business Dashboard', href: '/admin', icon: LayoutDashboard }] },
    { title: 'Receptionist AI', items: [{ label: 'The Receptionist', href: '/admin/receptionist', icon: Sparkles }] },
    {
      title: 'Specialist AIs',
      items: [
        { label: 'Specialists', href: '/admin/specialists', icon: Bot },
        { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
        { label: 'Payments', href: '/admin/payments', icon: Banknote },
      ],
    },
    {
      title: 'HERNE Intelligence',
      items: [
        { label: 'Overview', href: '/admin/herne', icon: HeartPulse },
        { label: 'Referrals', href: '/admin/herne/referrals', icon: GitBranch },
        { label: 'Care plans', href: '/admin/herne/care-plans', icon: ClipboardList },
        { label: 'Wearable data', href: '/admin/herne/wearable', icon: Watch },
        { label: 'Shared DNA', href: '/admin/herne/dna', icon: ShieldCheck },
      ],
    },
    { title: 'CRM', items: [{ label: 'Leads', href: '/admin/crm', icon: ContactRound }, { label: 'Appointments', href: '/admin/appointments', icon: CalendarDays }, { label: 'Messages', href: '/admin/messages', icon: Inbox }] },
    {
      title: 'Administration',
      items: [
        { label: 'AI Dashboard', href: '/admin/ai', icon: BarChart3 },
        { label: 'Knowledge Base', href: '/admin/knowledge', icon: BookOpen },
        { label: 'Prompts', href: '/admin/ai/prompts', icon: MessageSquareText },
        { label: 'Playground', href: '/admin/ai/playground', icon: FlaskConical },
        { label: 'Safety', href: '/admin/ai/safety', icon: ShieldCheck },
        { label: 'Memory', href: '/admin/ai/memory', icon: Brain },
        { label: 'Analytics', href: '/admin/ai/analytics', icon: BarChart3 },
        { label: 'Agent config', href: '/admin/ai/agents', icon: Wrench },
        { label: 'Consultations', href: '/admin/consultations', icon: Stethoscope },
        { label: 'Users', href: '/admin/users', icon: Users },
        { label: 'Integrations', href: '/admin/integrations', icon: Plug },
        { label: 'Configuration', href: '/admin/config', icon: Settings2 },
        { label: 'Audit Logs', href: '/admin/audit', icon: ScrollText },
      ],
    },
  ],
  dashboard: [
    { items: [{ label: 'Overview', href: '/dashboard', icon: LayoutDashboard }] },
    {
      title: 'My AI',
      items: [
        { label: 'My care plan', href: '/dashboard/care-plan', icon: ClipboardList },
        { label: 'Connected health', href: '/dashboard/connected-health', icon: Activity },
        { label: 'My specialists', href: '/dashboard/specialists', icon: Bot },
        { label: 'Conversations', href: '/dashboard/conversations', icon: MessageCircle },
        { label: 'My subscriptions', href: '/dashboard/subscriptions', icon: CreditCard },
        { label: 'Support', href: '/dashboard/support', icon: LifeBuoy },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'My goals', href: '/dashboard/goals', icon: Target },
        { label: 'Health profile', href: '/dashboard/profile', icon: HeartPulse },
        { label: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
        { label: 'Journey', href: '/dashboard/journey', icon: Route },
        { label: 'Journal', href: '/dashboard/journal', icon: BookOpen },
        { label: 'Bookings', href: '/dashboard/bookings', icon: CalendarDays },
        { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ],
};

/** Sidebar navigation with path-aware active state (longest-prefix match). */
export function SidebarNav({ variant, ariaLabel }: { variant: NavVariant; ariaLabel: string }) {
  const pathname = usePathname();
  const sections = NAV[variant];

  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const activeHref =
    allHrefs
      .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
      .sort((a, b) => b.length - a.length)[0] ?? '';

  return (
    <nav className="flex flex-1 flex-col gap-5 px-3 py-5" aria-label={ariaLabel}>
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-teal-50 text-primary'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                )}
              >
                <item.icon className="size-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
