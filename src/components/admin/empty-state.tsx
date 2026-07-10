import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      {Icon && (
        <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-muted-foreground">
          <Icon className="size-6" />
        </span>
      )}
      <p className="font-serif text-lg text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
