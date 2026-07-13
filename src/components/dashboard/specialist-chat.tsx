'use client';

import * as React from 'react';
import { Send, Paperclip, LifeBuoy, ThumbsUp, ThumbsDown, Square, FileText, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestSupportAction, messageFeedbackAction } from '@/services/conversation-actions';
import type { Message, MessageCitation } from '@/types/conversation';

const now = () => new Date().toISOString();

function blankMessage(partial: Partial<Message> & Pick<Message, 'id' | 'conversationId' | 'role' | 'content'>): Message {
  return { tokenCount: null, toolCalls: null, toolCallId: null, modelKey: null, createdAt: now(), citations: [], escalated: false, ...partial };
}

function Citations({ citations }: { citations: MessageCitation[] }) {
  if (!citations?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1">
      {citations.map((c) => {
        const chip = (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted-foreground" title={c.sourceTitle || c.recordId}>
            <FileText className="size-3 text-primary" /> {c.recordId}
          </span>
        );
        return c.sourceUrl ? (
          <a key={c.recordId} href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{chip}</a>
        ) : (
          <span key={c.recordId}>{chip}</span>
        );
      })}
    </div>
  );
}

export function SpecialistChat({
  conversationId,
  agentName,
  agentTitle,
  initialMessages,
  remembered,
}: {
  conversationId: string;
  agentName: string;
  agentTitle?: string;
  initialMessages: Message[];
  remembered: string[];
}) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = React.useState<string | null>(null);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rated, setRated] = React.useState<Record<string, 'up' | 'down'>>({});
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setBusy(true);
    setInput('');
    setMessages((m) => [...m, blankMessage({ id: `local_${m.length}`, conversationId, role: 'user', content })]);

    const controller = new AbortController();
    abortRef.current = controller;
    let streamed = '';
    try {
      const resp = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({ error: 'The reply could not be completed.' }));
        setError(j.error ?? 'The reply could not be completed.');
        setBusy(false);
        return;
      }
      setStreaming('');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const l of lines) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l) as { type: string; text?: string; message?: Message | null; error?: string; citations?: MessageCitation[]; escalated?: boolean };
          if (ev.type === 'delta') {
            streamed += ev.text ?? '';
            setStreaming(streamed);
          } else if (ev.type === 'final') {
            const finalMsg = ev.message ?? blankMessage({ id: `srv_${Date.now()}`, conversationId, role: 'assistant', content: streamed, citations: ev.citations ?? [], escalated: ev.escalated ?? false });
            setMessages((m) => [...m, finalMsg]);
            setStreaming(null);
          } else if (ev.type === 'error') {
            setError(ev.error ?? 'The reply could not be completed.');
          }
        }
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        if (streamed) setMessages((m) => [...m, blankMessage({ id: `stopped_${m.length}`, conversationId, role: 'assistant', content: `${streamed}\n\n_(stopped)_` })]);
      } else {
        setError('The reply could not be completed.');
      }
    } finally {
      setStreaming(null);
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
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
    if (file) send(`I’ve attached a file: ${file.name} (prototype — the file is not stored).`);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Active specialist header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface-muted/60 px-5 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#12233a] font-serif text-sm text-[#c9a961]">{agentName.charAt(0)}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{agentName}</p>
          {agentTitle && <p className="truncate text-xs text-muted-foreground">{agentTitle}</p>}
        </div>
      </div>

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
            {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && <Citations citations={msg.citations} />}
            {msg.role === 'assistant' && msg.escalated && (
              <div className="ml-1 mt-1 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{msg.referral ? `Suggested handoff to ${msg.referral.toRole} — ${msg.referral.reason}` : 'This may need human clinical review.'}</span>
              </div>
            )}
            {msg.role === 'assistant' && msg.referral && !msg.escalated && (
              <div className="ml-1 mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowRightLeft className="size-3.5 text-primary" /> Suggested: {msg.referral.toRole}
              </div>
            )}
            {msg.role === 'assistant' && !msg.id.startsWith('local_') && !msg.id.startsWith('stopped_') && (
              <div className="flex gap-1 pl-1">
                <button type="button" aria-label="Helpful" onClick={() => rate(msg.id, 'up')} className={`rounded p-1 ${rated[msg.id] === 'up' ? 'text-secondary' : 'text-muted-foreground hover:text-foreground'}`}>
                  <ThumbsUp className="size-3.5" />
                </button>
                <button type="button" aria-label="Not helpful" onClick={() => rate(msg.id, 'down')} className={`rounded p-1 ${rated[msg.id] === 'down' ? 'text-danger' : 'text-muted-foreground hover:text-foreground'}`}>
                  <ThumbsDown className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {streaming !== null && (
          <div className="flex justify-start">
            <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-muted px-4 py-2.5 text-sm text-foreground">
              {streaming || <span className="text-muted-foreground">{agentName} is thinking…</span>}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        {error && <p className="mb-2 text-sm text-danger" role="alert">{error}</p>}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
          <input ref={fileRef} type="file" className="hidden" onChange={onFile} aria-label="Upload a file" />
          <Button type="button" intent="ghost" size="sm" aria-label="Attach a file" onClick={() => fileRef.current?.click()} disabled={busy}>
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
          {busy ? (
            <Button type="button" intent="outline" size="sm" onClick={stop} aria-label="Stop generating">
              <Square className="size-4" /> Stop
            </Button>
          ) : (
            <Button type="submit" size="sm" disabled={!input.trim()} aria-label="Send message">
              <Send className="size-4" />
            </Button>
          )}
        </form>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button type="button" intent="ghost" size="sm" onClick={requestSupport} disabled={busy}>
            <LifeBuoy className="size-4" /> Request human support
          </Button>
          <p className="text-right text-xs text-muted-foreground">
            Prototype — AI-generated, not clinically reviewed. Not for emergencies — call your local emergency services.
          </p>
        </div>
      </div>
    </div>
  );
}
