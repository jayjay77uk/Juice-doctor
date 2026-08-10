'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendCareTeamMessageAction } from '@/services/escalation-actions';

/** Reply into an escalated member conversation (human takeover). */
export function CareTeamMessageForm({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(sendCareTeamMessageAction, { status: 'idle' as const });

  if (!open) {
    return (
      <Button type="button" intent="ghost" size="sm" onClick={() => setOpen(true)}>
        <MessageSquare className="size-4" /> Message member
      </Button>
    );
  }

  return (
    <form action={action} className="flex w-full max-w-md flex-col gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <textarea
        name="message"
        rows={2}
        maxLength={2000}
        placeholder="Write to the member — this appears in their conversation as a care-team message."
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
        aria-label="Message to the member"
      />
      {state.status !== 'idle' && state.message && (
        <p className={state.status === 'error' ? 'text-xs text-danger' : 'text-xs text-secondary'} role="status">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Send
        </Button>
        <Button type="button" intent="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Close
        </Button>
      </div>
    </form>
  );
}
