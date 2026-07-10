import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { site } from '@/content/site';
import { Logo } from './logo';
import { cn } from '@/lib/cn';

export interface ShellNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

/**
 * The authenticated app shell used by the (dashboard) and (admin) route groups.
 * Static in the prototype — visually complete so reviewers can see every state.
 */
export function AppShell({
  roleLabel,
  userName,
  nav,
  children,
}: {
  roleLabel: string;
  userName: string;
  nav: ShellNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-cream-100 lg:grid-cols-[16rem_1fr]">
      {/* Sidebar */}
      <aside className="hidden flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border px-6 py-5">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-5" aria-label={roleLabel}>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {roleLabel}
          </p>
          <ul className="flex flex-col gap-1">
            {nav.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    item.active
                      ? 'bg-teal-50 text-primary'
                      : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="size-4.5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border p-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 py-4 backdrop-blur">
          <div className="lg:hidden">
            <Logo />
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">{site.name} · {roleLabel}</p>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">Prototype session</p>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-teal-100 font-serif text-primary">
              {userName.charAt(0)}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
