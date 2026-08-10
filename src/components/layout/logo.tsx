import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { site } from '@/content/site';

/**
 * Brand wordmark. A simple, premium lockup: a drop glyph + the name.
 * Interim mark — replace the glyph when the client supplies final logo artwork.
 */
export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ring)]',
        className,
      )}
      aria-label={`${site.name} — home`}
    >
      <span
        className={cn(
          'grid size-9 place-items-center rounded-full transition-colors',
          inverse ? 'bg-cream-50/10 text-cream-50' : 'bg-primary text-primary-foreground',
        )}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none">
          <path
            d="M12 2.5c3.6 4.2 6 7.4 6 10.6a6 6 0 1 1-12 0c0-3.2 2.4-6.4 6-10.6Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path d="M9.2 12.6a2.8 2.8 0 0 0 2.8 2.8" stroke="var(--color-cream-100)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className={cn('flex flex-col leading-none', inverse ? 'text-cream-50' : 'text-foreground')}>
        <span className="font-serif text-lg font-semibold tracking-tight">{site.name}</span>
        <span className={cn('text-[0.62rem] font-medium uppercase tracking-[0.22em]', inverse ? 'text-cream-200' : 'text-muted-foreground')}>
          Wellbeing Platform
        </span>
      </span>
    </Link>
  );
}
