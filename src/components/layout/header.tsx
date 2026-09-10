'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { cn } from '@/lib/cn';

const nav = [
  { label: 'Home', href: '/' },
  { label: 'The HERNE Protocol', href: '/framework' },
  { label: 'Our AI Specialists', href: '/specialists' },
  { label: 'Success Stories', href: '/#success-stories' },
  { label: 'Resources', href: '/resources' },
  { label: 'About', href: '/about' },
];

export function Header() {
  const [condensed, setCondensed] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-white/10 bg-[#070908]/98 text-white backdrop-blur-xl transition-shadow',
        condensed && 'shadow-[0_12px_35px_rgba(0,0,0,.42)]',
      )}
    >
      <div className="relative mx-auto flex h-[3.85rem] w-full max-w-[1055px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-[3.8rem]">
        <Logo inverse className="shrink-0" />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
          {nav.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'relative px-2.5 py-2 text-[0.66rem] font-medium text-white/82 transition hover:text-white xl:px-3',
                index === 0 && 'after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-9 after:-translate-x-1/2 after:bg-[#f0c42d]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={searchOpen ? 'Close search' : 'Search'}
            onClick={() => setSearchOpen((value) => !value)}
            className="hidden size-9 place-items-center rounded-full text-white/78 transition hover:bg-white/[0.06] hover:text-white md:grid"
          >
            {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
          </button>
          <Link
            href="/assistant"
            className="hidden min-h-10 items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#ff6b30,#ffad29_50%,#ffe533)] px-5 text-[0.7rem] font-bold text-black shadow-[0_8px_25px_rgba(242,163,42,.20)] transition hover:brightness-105 sm:inline-flex"
          >
            Start Your Journey <span aria-hidden>→</span>
          </Link>
          <MobileMenu />
        </div>

        {searchOpen && (
          <form action="/resources" method="GET" className="absolute inset-x-5 top-[calc(100%+.5rem)] z-20 rounded-xl border border-white/12 bg-[#111412] p-2 shadow-2xl sm:left-auto sm:right-8 sm:w-[22rem] lg:right-[3.8rem]">
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3">
              <Search className="size-4 text-white/45" />
              <input autoFocus name="q" placeholder="Search resources..." className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/38" />
            </div>
          </form>
        )}
      </div>
    </header>
  );
}
