import * as React from 'react';
import { cn } from '@/lib/cn';

/** A small uppercase kicker label used above headings. */
export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary',
        className,
      )}
      {...props}
    />
  );
}
