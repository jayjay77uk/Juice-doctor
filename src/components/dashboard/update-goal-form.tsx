'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateGoalAction } from '@/services/goal-actions';

const controlClass =
  'w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'achieved', label: 'Achieved' },
  { value: 'paused', label: 'Paused' },
  { value: 'abandoned', label: 'Abandoned' },
];

/** Inline update control for a goal — progress %, current value and status. */
export function UpdateGoalForm({
  goalId,
  progress,
  currentValue,
  status,
  unit,
}: {
  goalId: string;
  progress: number;
  currentValue: number | null;
  status: string;
  unit: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    progress: String(progress),
    currentValue: currentValue == null ? '' : String(currentValue),
    status,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateGoalAction({
      goalId,
      progress: Number(form.progress),
      status: form.status,
      currentValue: form.currentValue,
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error ?? 'Could not update the goal.');
    }
  }

  if (!open) {
    return (
      <Button type="button" intent="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Update progress
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/50 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Progress (%)
          <input type="number" min={0} max={100} value={form.progress} onChange={set('progress')} className={controlClass} aria-label="Progress percent" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Current value{unit ? ` (${unit})` : ''}
          <input type="number" min={0} step="any" value={form.currentValue} onChange={set('currentValue')} className={controlClass} aria-label="Current value" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Status
          <select value={form.status} onChange={set('status')} className={controlClass} aria-label="Goal status">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save
        </Button>
        <Button type="button" intent="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
          <X className="size-4" /> Cancel
        </Button>
      </div>
    </form>
  );
}
