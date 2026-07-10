import * as React from 'react';
import { cn } from '@/lib/cn';

/** A titled content panel used throughout the admin surfaces. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn('rounded-2xl border border-border bg-surface', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="font-serif text-lg text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && 'p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}
