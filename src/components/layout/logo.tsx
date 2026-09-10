import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        'group inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4',
        className,
      )}
      aria-label="Ask Juice Doctor AI — home"
    >
      <span className="relative grid size-11 shrink-0 place-items-center" aria-hidden>
        <svg viewBox="0 0 48 48" className="size-11 overflow-visible">
          <path d="M17 12C10 10 7 6 7 3c7 0 12 3 14 8" fill="#44a54a" />
          <path d="M21 11C20 4 23 0 29 0c1 6-1 11-7 15" fill="#44a54a" />
          <path d="M12 24c0-9 7-15 17-15 8 0 13 3 16 8-8 0-12 4-15 9-4 7-8 12-14 12-3-4-4-9-4-14Z" fill="#ec922a" />
          <path d="M12 24c0-7 5-12 11-14 6 0 11 2 15 6-8 1-12 5-15 10-3 5-6 8-10 10-1-4-1-8-1-12Z" fill="#f2c92a" opacity=".94" />
          <path d="M31 8c7 0 12 3 14 9-7 0-12 3-15 8 1-7 1-12 1-17Z" fill="#e04728" />
          <path d="M33 29c4-3 8-4 12-2 2 4 1 8-1 11-5-2-8-5-11-9Z" fill="#e04728" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn('text-[0.64rem] font-medium uppercase tracking-[0.24em]', inverse ? 'text-white/65' : 'text-ink-500')}>
          Ask
        </span>
        <span className="font-serif text-[1.5rem] font-semibold tracking-[-0.04em]">
          <span className="text-[#e04728]">Juice</span>{' '}
          <span className={inverse ? 'text-white' : 'text-ink-900'}>Doctor</span>
        </span>
        <span className={cn('mt-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.22em]', inverse ? 'text-[#f2c92a]' : 'text-[#a98110]')}>
          AI wellbeing
        </span>
      </span>
    </Link>
  );
}
