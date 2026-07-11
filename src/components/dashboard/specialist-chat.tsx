'use client';

import * as React from 'react';
import { Send, Paperclip, LifeBuoy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  sendMessageAction,
  requestSupportAction,
  messageFeedbackAction,
} from '@/services/conversation-actions';
import type { Message } from '@/types/conversation';

const now = () => new Date().toISOString();

export function SpecialistChat({
  conversationId,
  agentName,
  initialMessages,
  remembered,
}: {
  conversationId: string;
  agentName: string;
  initialMessages: Message[];
  remembered: string[];
}) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rated, setRated] = React.useState<Record<string, 'up' | 'down'>>({});
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError(null);
    setBusy(true);
    setInput('');
    // optimistic user bubble
    setMessages((m) => [...m, { id: `local_${m.length}`, conversationId, role: 'user', content: text.trim(), tokenCount: null, toolCalls: null, toolCallId: null, modelKey: null, createdAt: now() }]);
    const res = await sendMessageAction(conversationId, text.trim());
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setMessages(res.messages);
  }

  async function requestSupport() {
    if (busy) return;
    setBusy(true);
    const res = await requestSupportAction(conversationId);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setMessages(res.messages);
  }

  async function rate(messageId: string, rating: 'up' | 'down') {
    setRated((r) => ({ ...r, [messageId]: rating }));
    await messageFeedbackAction(messageId, rating);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) send(`📎 Uploaded a file: ${file.name} (prototype — the file is not stored).`);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      {remembered.length > 0 && (
        <div className="border-b border-border bg-surface-muted px-5 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Remembered for you:</span> {remembered.join(' · ')}
        </div>
      )}

      <div ref={scrollRef} className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto px-5 py-6">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-1">
            <div className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <p
                className={
                  msg.role === 'user'
                    ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground'
                    : msg.role === 'system'
                      ? 'max-w-[90%] whitespace-pre-wrap rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-foreground'
                      : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-muted px-4 py-2.5 text-sm text-foreground'
                }
              >
                {msg.content}
              </p>
            </div>
            {msg.role === 'assistant' && !msg.id.startsWith('local_') && (
              <div className="flex gap-1 pl-1">
                <button
                  type="button"
                  aria-label="Helpful"
                  onClick={() => rate(msg.id, 'up')}
                  className={`rounded p-1 ${rated[msg.id] === 'up' ? 'text-secondary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ThumbsUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Not helpful"
                  onClick={() => rate(msg.id, 'down')}
                  className={`rounded p-1 ${rated[msg.id] === 'down' ? 'text-danger' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ThumbsDown className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <p className="pl-1 text-xs text-muted-foreground">{agentName} is typing…</p>}
      </div>

      <div className="border-t border-border p-4">
        {error && <p className="mb-2 text-sm text-danger" role="alert">{error}</p>}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2"
        >
          <input ref={fileRef} type="file" className="hidden" onChange={onFile} aria-label="Upload a file" />
          <Button type="button" intent="ghost" size="sm" aria-label="Attach a file" onClick={() => fileRef.current?.click()}>
            <Paperclip className="size-4" />
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            placeholder={`Message ${agentName}…`}
            aria-label="Your message"
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
          />
          <Button type="submit" size="sm" disabled={busy || !input.trim()} aria-label="Send message">
            <Send className="size-4" />
          </Button>
        </form>
        <div className="mt-3 flex items-center justify-between">
          <Button type="button" intent="ghost" size="sm" onClick={requestSupport} disabled={busy}>
            <LifeBuoy className="size-4" /> Request human support
          </Button>
          <p className="text-xs text-muted-foreground">Prototype — no live AI is connected.</p>
        </div>
      </div>
    </div>
  );
}
