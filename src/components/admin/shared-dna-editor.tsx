'use client';

import * as React from 'react';
import { Plus, Trash2, Check, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveSharedDnaAction } from '@/services/herne/admin-actions';

const controlClass =
  'w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]';

/**
 * Editor for the HERNE shared DNA — the values every specialist upholds. Add,
 * remove and reorder-by-editing the lines, then save. The runtime prompt assembler
 * reads these immediately, so this is the one collaboration-layer write in admin.
 */
export function SharedDnaEditor({ initial }: { initial: string[] }) {
  const [items, setItems] = React.useState<string[]>(initial.length ? initial : ['']);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  function update(i: number, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? value : it)));
    setSaved(false);
  }
  function add() {
    setItems((prev) => [...prev, '']);
    setSaved(false);
  }
  function remove(i: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
    setSaved(false);
  }
  function reset() {
    setItems(initial.length ? initial : ['']);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await saveSharedDnaAction(items.map((s) => s.trim()).filter(Boolean));
      if (res.ok) {
        setItems(res.dna);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  const dirty = JSON.stringify(items.map((s) => s.trim()).filter(Boolean)) !== JSON.stringify(initial);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {items.map((value, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
            <input
              value={value}
              onChange={(e) => update(i, e.target.value)}
              className={controlClass}
              placeholder="A value every specialist upholds…"
              aria-label={`Shared value ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]"
              aria-label={`Remove value ${i + 1}`}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" intent="outline" size="sm" onClick={add}>
          <Plus className="size-4" /> Add value
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          {saved ? 'Saved' : 'Save shared DNA'}
        </Button>
        {dirty && !saving && (
          <Button type="button" intent="ghost" size="sm" onClick={reset}>
            <RotateCcw className="size-4" /> Reset
          </Button>
        )}
        {saved && <span className="text-sm text-muted-foreground">Every specialist now upholds these values.</span>}
      </div>
    </div>
  );
}
