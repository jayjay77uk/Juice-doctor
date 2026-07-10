import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * A designed "coming soon (prototype)" panel — a real branded moment for
 * high-intent features not built in Phase 1 (e.g. the Ask Juice Doctor AI),
 * never a greyed-out button.
 */
export function ComingSoon({
  title,
  body,
  className,
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface-muted p-8 text-center',
        className,
      )}
    >
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-amber-50 text-accent-strong">
        <Sparkles className="size-5" />
      </span>
      <p className="mx-auto mb-1 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Coming in the full platform
      </p>
      <h3 className="mt-3 text-h3 text-foreground">{title}</h3>
      <p className="measure mx-auto mt-2 text-muted-foreground">{body}</p>
    </div>
  );
}
