'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { cn } from '@/lib/cn';

const nav = [
  { label: 'Home', href: '/' },
  { label: 'The HERNE Protocol', href: '/framework' },
  { label: 'Our AI Specialists', href: '/specialists' },
  { label: 'Success Stories', href: '/#stories' },
  { label: 'Resources', href: '/resources' },
  { label: 'About', href: '/about' },
];

export function Header() {
  const [condensed, setCondensed] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-white/10 bg-[#080a09]/96 text-white backdrop-blur-xl transition-all duration-300',
        condensed ? 'shadow-[0_12px_35px_rgba(0,0,0,0.32)]' : '',
      )}
    >
      <div className="mx-auto flex h-[4.6rem] w-full max-w-[92rem] items-center justify-between gap-5 px-5 sm:px-8 lg:px-14">
        <Logo inverse />

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary navigation">
          {nav.map((item, index) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                'relative rounded-full px-3.5 py-2 text-[0.78rem] font-medium text-white/80 transition-colors hover:text-white',
                index === 0 && 'after:absolute after:bottom-0.5 after:left-1/2 after:h-px after:w-8 after:-translate-x-1/2 after:bg-[#f2c92a]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/resources"
            aria-label="Search resources"
            className="hidden size-10 place-items-center rounded-full text-white/76 transition hover:bg-white/[0.06] hover:text-white lg:grid"
          >
            <Search className="size-4" />
          </Link>
          <Link
            href="/assistant"
            className="brand-gradient hidden min-h-10 items-center justify-center gap-2 rounded-full px-5 text-xs font-bold text-[#111] shadow-[0_8px_28px_rgba(224,71,40,0.24)] transition hover:scale-[1.01] sm:inline-flex"
          >
            Start Your Journey <span aria-hidden>→</span>
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
