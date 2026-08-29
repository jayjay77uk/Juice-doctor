'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from './logo';
import { SidebarNav, type NavVariant } from './sidebar-nav';

/**
 * Mobile navigation for the authenticated app shell (dashboard + admin). The
 * desktop sidebar is hidden below `lg`, so this hamburger + slide-over drawer
 * gives phones/tablets access to the same SidebarNav. Closes on route change.
 */
export function MobileAppNav({
  navVariant,
  roleLabel,
  adminHref,
  practitionerHref,
}: {
  navVariant: NavVariant;
  roleLabel: string;
  adminHref?: string | undefined;
  practitionerHref?: string | undefined;
}) {
  const [open, setOpen] = React.useState(false);

  // Lock body scroll while the drawer is open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-lg border border-border text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-r border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-surface-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            {/* Close the drawer when any nav link is tapped (soft nav keeps state). */}
            <div
              className="flex-1 overflow-y-auto"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('a')) setOpen(false);
              }}
            >
              <SidebarNav variant={navVariant} ariaLabel={roleLabel} />
              <div className="flex flex-col gap-2 border-t border-border p-4">
                {adminHref ? (
                  <Link href={adminHref} className="text-sm font-medium text-primary hover:underline">
                    Admin dashboard →
                  </Link>
                ) : null}
                {practitionerHref ? (
                  <Link href={practitionerHref} className="text-sm font-medium text-primary hover:underline">
                    Practitioner console →
                  </Link>
                ) : null}
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
                  ← Back to site
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
