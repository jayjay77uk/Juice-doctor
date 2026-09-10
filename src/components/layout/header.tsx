'use client';

import * as React from 'react';
import Link from 'next/link';
import { routes } from '@/config/routes';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { cn } from '@/lib/cn';

const nav = [
  { label: 'HERNE Protocol', href: routes.framework.href },
  { label: 'Specialists', href: routes.specialists.href },
  { label: 'Programmes', href: routes.programmes.href },
  { label: 'Resources', href: routes.resources.href },
  { label: 'About', href: routes.about.href },
];

export function Header() {
  const [condensed, setCondensed] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-white/10 bg-[#080808] text-white transition-all duration-300',
        condensed ? 'shadow-[0_12px_35px_rgba(0,0,0,0.28)]' : '',
      )}
    >
      <div className="mx-auto flex h-[var(--header-h)] w-full max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Logo inverse />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-white/78 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={routes.login.href}
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-white/72 transition-colors hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href={routes.assistant.href}
            className="brand-gradient hidden min-h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#111] shadow-[0_8px_28px_rgba(224,71,40,0.25)] transition-transform hover:-translate-y-0.5 sm:inline-flex"
          >
            Start your journey
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
