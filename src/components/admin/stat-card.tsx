import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
}

export function StatCard({ label, value, icon: Icon, hint, trend }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        {Icon && (
          <span className="grid size-9 place-items-center rounded-full bg-teal-100 text-primary">
            <Icon className="size-4.5" />
          </span>
        )}
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              trend.direction === 'down'
                ? 'bg-[#f6e3e0] text-danger'
                : trend.direction === 'flat'
                  ? 'bg-surface-muted text-muted-foreground'
                  : 'bg-green-100 text-secondary',
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 font-serif text-3xl text-foreground tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
