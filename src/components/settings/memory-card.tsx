'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Trash2, Loader2 } from 'lucide-react';
import { Panel } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { forgetMemoryAction, forgetAllMemoryAction, setMemoryEnabledAction } from '@/services/memory-actions';

export interface StoredMemory {
  id: string;
  kind: string;
  content: string;
  source: string;
  createdAt: string;
}

/** View, correct-by-deleting, clear, and disable the memories the platform holds. */
export function MemoryCard({ enabled, memories }: { enabled: boolean; memories: StoredMemory[] }) {
  const router = useRouter();
  const [on, setOn] = React.useState(enabled);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function toggle() {
    setBusy('toggle');
    const next = !on;
    const res = await setMemoryEnabledAction(next);
    setBusy(null);
    if (res.ok) { setOn(next); router.refresh(); }
  }

  async function forget(id: string) {
    setBusy(id);
    const res = await forgetMemoryAction(id);
    setBusy(null);
    if (res.ok) router.refresh();
  }

  async function clearAll() {
    if (!confirm('Delete everything the platform remembers about you?')) return;
    setBusy('all');
    await forgetAllMemoryAction();
    setBusy(null);
    router.refresh();
  }

  return (
    <Panel
      title="Memory"
      description="Your specialists can remember preferences you share (e.g. dietary needs) so you don’t repeat yourself. You’re in control."
    >
      <div className="flex flex-col gap-4">
        <label htmlFor="memory-enabled" className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-surface-muted/60 px-4 py-3">
          <span className="flex items-start gap-3">
            <Brain className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Remember what I share</span>
              <span className="text-xs text-muted-foreground">When off, nothing new is stored and everything remembered is cleared.</span>
            </span>
          </span>
          <input id="memory-enabled" type="checkbox" checked={on} onChange={toggle} disabled={busy === 'toggle'} className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]" />
        </label>

        {memories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is remembered yet.</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {memories.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                  <Badge tone="neutral" className="mt-0.5 capitalize">{m.kind}</Badge>
                  <p className="min-w-0 flex-1 text-sm text-foreground">{m.content}</p>
                  <button type="button" onClick={() => forget(m.id)} disabled={busy === m.id} aria-label="Forget this" className="shrink-0 rounded p-1 text-muted-foreground hover:text-danger">
                    {busy === m.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <Button type="button" intent="outline" size="sm" onClick={clearAll} disabled={busy === 'all'} className="border-danger/40 text-danger hover:bg-danger/5">
                <Trash2 className="size-4" /> Forget everything
              </Button>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
