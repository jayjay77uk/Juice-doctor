'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateDisplayNameAction, updateHealthBasicsAction } from '@/services/profile-actions';

const controlClass =
  'w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]';

/** Edit the member's display name (writes their own profiles row via RLS). */
export function DisplayNameForm({ current }: { current: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState(current);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateDisplayNameAction({ displayName: name });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error ?? 'Could not update your name.');
    }
  }

  if (!open) {
    return (
      <Button type="button" intent="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Edit name
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
        Display name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={controlClass} aria-label="Display name" />
      </label>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save
      </Button>
      <Button type="button" intent="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy} aria-label="Cancel">
        <X className="size-4" />
      </Button>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

const SEX_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'intersex', label: 'Intersex' },
  { value: 'unknown', label: 'Unknown' },
];

/** Edit the health basics the platform actually uses (upsert, session-owned). */
export function HealthBasicsForm({
  dateOfBirth,
  biologicalSex,
  heightCm,
  weightKg,
}: {
  dateOfBirth: string | null;
  biologicalSex: string | null;
  heightCm: number | null;
  weightKg: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    dateOfBirth: dateOfBirth ?? '',
    biologicalSex: biologicalSex ?? '',
    heightCm: heightCm == null ? '' : String(heightCm),
    weightKg: weightKg == null ? '' : String(weightKg),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateHealthBasicsAction(form);
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error ?? 'Could not save your details.');
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Edit profile
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-xl flex-col gap-3 rounded-xl border border-border bg-surface-muted/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Date of birth
          <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} className={controlClass} aria-label="Date of birth" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Biological sex
          <select value={form.biologicalSex} onChange={set('biologicalSex')} className={controlClass} aria-label="Biological sex">
            {SEX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Height (cm)
          <input type="number" min={50} max={260} step="any" value={form.heightCm} onChange={set('heightCm')} className={controlClass} aria-label="Height in centimetres" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Weight (kg)
          <input type="number" min={20} max={400} step="any" value={form.weightKg} onChange={set('weightKg')} className={controlClass} aria-label="Weight in kilograms" />
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
          Cancel
        </Button>
      </div>
    </form>
  );
}
