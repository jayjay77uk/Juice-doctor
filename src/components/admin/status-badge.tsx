import * as React from 'react';
import { cn } from '@/lib/cn';

type Tone = 'green' | 'amber' | 'red' | 'teal' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  green: 'bg-green-100 text-secondary',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-[#f6e3e0] text-danger',
  teal: 'bg-teal-100 text-teal-700',
  neutral: 'bg-surface-muted text-muted-foreground',
};

/** Maps common lifecycle/status strings to a consistent coloured pill. */
const STATUS_TONE: Record<string, Tone> = {
  // publish / lifecycle
  published: 'green',
  active: 'green',
  approved: 'green',
  enabled: 'green',
  on: 'green',
  ok: 'green',
  in_review: 'amber',
  pending: 'amber',
  draft: 'amber',
  requested: 'amber',
  scheduled: 'amber',
  awaiting_review: 'amber',
  rejected: 'red',
  cancelled: 'red',
  failed: 'red',
  disabled: 'neutral',
  archived: 'neutral',
  off: 'neutral',
  deleted: 'neutral',
  completed: 'teal',
  confirmed: 'teal',
  private: 'neutral',
  organisation: 'teal',
  public: 'green',
};

function humanise(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({
  status,
  tone,
  className,
}: {
  status: string;
  tone?: Tone;
  className?: string;
}) {
  const resolved = tone ?? STATUS_TONE[status.toLowerCase()] ?? 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        TONE_CLASS[resolved],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {humanise(status)}
    </span>
  );
}
