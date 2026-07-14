'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startConversationAction } from '@/services/conversation-actions';

/** Start a new specialist conversation — Makela (concierge) first. */
export function NewConversationButton({ specialists }: { specialists: { id: string; name: string; concierge?: boolean }[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function start(agentId: string) {
    setBusy(agentId);
    setError(null);
    const res = await startConversationAction(agentId);
    setBusy(null);
    if (res.ok) router.push(`/dashboard/conversations/${res.conversationId}`);
    else setError(res.error || 'Could not start the conversation. Please try again.');
  }

  return (
    <div className="relative" ref={ref}>
      <Button size="sm" onClick={() => setOpen((o) => !o)} disabled={specialists.length === 0}>
        <Plus className="size-4" /> New conversation
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <p className="border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">Choose a specialist</p>
          <ul className="max-h-72 overflow-y-auto py-1">
            {specialists.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => start(s.id)}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-surface-muted disabled:opacity-50"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#12233a] font-serif text-xs text-[#c9a961]">{s.name.charAt(0)}</span>
                  <span className="flex-1">{s.name}{s.concierge ? ' · concierge' : ''}</span>
                  {busy === s.id && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                </button>
              </li>
            ))}
          </ul>
          {error && <p className="border-t border-border px-4 py-2 text-xs text-danger" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
