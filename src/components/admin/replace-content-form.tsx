'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { replaceDocumentContentAction } from '@/services/admin-actions';
import { idleAction } from '@/services/result';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

/** Replace a knowledge document's content as a new version (history preserved). */
export function ReplaceContentForm({ documentId }: { documentId: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(replaceDocumentContentAction, idleAction);

  if (!open) {
    return (
      <Button type="button" intent="outline" size="sm" onClick={() => setOpen(true)}>
        <RefreshCcw className="size-4" /> Replace content (new version)
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={documentId} />
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Replacement content
        <textarea name="content" rows={8} className={inputClass} placeholder="Paste the full replacement text — it becomes the new current version and is re-indexed for retrieval." />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Change note (optional)
        <input name="changeNote" maxLength={300} className={inputClass} placeholder="What changed and why" />
      </label>
      {state.status !== 'idle' && state.message && (
        <p className={state.status === 'error' ? 'text-sm text-danger' : 'text-sm text-secondary'} role="status">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save new version
        </Button>
        <Button type="button" intent="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
