'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Archive, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { renameConversationAction, archiveConversationAction } from '@/services/conversation-actions';

/** Rename + archive controls for a conversation thread. */
export function ConversationToolbar({ conversationId, title }: { conversationId: string; title: string }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(title);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function saveRename() {
    setBusy(true);
    setError(null);
    const res = await renameConversationAction(conversationId, value);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setEditing(false);
    router.refresh();
  }

  async function archive() {
    if (!confirm('Archive this conversation? You can still find it under archived.')) return;
    setBusy(true);
    const res = await archiveConversationAction(conversationId);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    router.push('/dashboard/conversations');
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-56 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus-visible:border-primary"
          aria-label="Conversation title"
          autoFocus
        />
        <Button size="sm" onClick={saveRename} disabled={busy || !value.trim()} aria-label="Save title"><Check className="size-4" /></Button>
        <Button size="sm" intent="ghost" onClick={() => { setEditing(false); setValue(title); }} aria-label="Cancel"><X className="size-4" /></Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" intent="ghost" onClick={() => setEditing(true)}><Pencil className="size-4" /> Rename</Button>
      <Button size="sm" intent="ghost" onClick={archive} disabled={busy}><Archive className="size-4" /> Archive</Button>
    </div>
  );
}
