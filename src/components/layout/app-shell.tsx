import * as React from 'react';
import Link from 'next/link';
import { site } from '@/content/site';
import { signOut } from '@/services/actions';
import { Logo } from './logo';
import { SidebarNav, type NavVariant } from './sidebar-nav';
import { PrototypeNotices } from './prototype-notices';

export type { NavVariant } from './sidebar-nav';

/**
 * The authenticated app shell used by the (dashboard) and (admin) route groups.
 * Takes a serialisable `navVariant`; the client SidebarNav owns the nav config
 * (and its icons) and highlights the active route by path.
 */
export function AppShell({
  roleLabel,
  userName,
  navVariant,
  adminHref,
  children,
}: {
  roleLabel: string;
  userName: string;
  navVariant: NavVariant;
  /** When set, show a cross-link to the admin dashboard (for admins in the member area). */
  adminHref?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-cream-100 lg:grid-cols-[16rem_1fr]">
      {/* Sidebar */}
      <aside className="hidden flex-col border-r border-border bg-surface lg:flex lg:sticky lg:top-0 lg:max-h-dvh">
        <div className="border-b border-border px-6 py-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav variant={navVariant} ariaLabel={roleLabel} />
        </div>
        <div className="flex flex-col gap-2 border-t border-border p-4">
          {adminHref ? (
            <Link href={adminHref} className="text-sm font-medium text-primary hover:underline">
              Admin dashboard →
            </Link>
          ) : null}
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-surface/85 px-6 py-4 backdrop-blur">
          <div className="lg:hidden">
            <Logo />
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">
            {site.name} · {roleLabel}
          </p>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <form action={signOut}>
                <button type="submit" className="text-xs text-muted-foreground hover:text-primary">
                  Sign out
                </button>
              </form>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-teal-100 font-serif text-primary">
              {userName.charAt(0)}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-5 py-8 sm:px-8">{children}</main>
        <footer className="border-t border-border px-5 pb-8 pt-4 sm:px-8">
          <PrototypeNotices className="mx-auto max-w-5xl" />
        </footer>
      </div>
    </div>
  );
}
