'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createGoalAction } from '@/services/goal-actions';

const controlClass =
  'w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]';

const CATEGORY_OPTIONS = [
  { value: 'wellbeing', label: 'Wellbeing' },
  { value: 'hydration', label: 'Hydration' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'movement', label: 'Movement' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'weight', label: 'Weight' },
  { value: 'other', label: 'Other' },
];

/** Add-goal button + collapsible form — creates a real goal for the signed-in member. */
export function AddGoalForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: '', category: 'wellbeing', description: '', targetValue: '', unit: '', targetDate: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createGoalAction(form);
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setForm({ title: '', category: 'wellbeing', description: '', targetValue: '', unit: '', targetDate: '' });
      router.refresh();
    } else {
      setError(res.error ?? 'Could not create the goal.');
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add goal
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-foreground">Add a goal</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-muted">
            <X className="size-4" />
          </button>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          What do you want to achieve? <span className="text-danger">*</span>
          <input value={form.title} onChange={set('title')} maxLength={120} placeholder="e.g. Walk 8,000 steps a day" className={controlClass} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Area
            <select value={form.category} onChange={set('category')} className={controlClass}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Target date <span className="font-normal text-muted-foreground">(optional)</span>
            <input type="date" value={form.targetDate} onChange={set('targetDate')} className={controlClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Target number <span className="font-normal text-muted-foreground">(optional)</span>
            <input type="number" inputMode="decimal" value={form.targetValue} onChange={set('targetValue')} placeholder="e.g. 8000" className={controlClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Unit <span className="font-normal text-muted-foreground">(optional)</span>
            <input value={form.unit} onChange={set('unit')} maxLength={20} placeholder="e.g. steps, ml, hrs" className={controlClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Why this matters to you <span className="font-normal text-muted-foreground">(optional)</span>
          <input value={form.description} onChange={set('description')} maxLength={500} className={controlClass} />
        </label>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" intent="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create goal
          </Button>
        </div>
      </form>
    </div>
  );
}
