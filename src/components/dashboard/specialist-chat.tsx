'use client';

import * as React from 'react';
import { Send, LifeBuoy, ThumbsUp, ThumbsDown, Square, FileText, AlertTriangle, ArrowRightLeft, Mic, Volume2, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestSupportAction, messageFeedbackAction } from '@/services/conversation-actions';
import { VoiceInputButton, SpeakButton, VoiceModeSwitch, useReplyAudio, useVoiceLoop } from '@/components/dashboard/voice-controls';
import { voiceModesFor, type VoiceMode } from '@/lib/voice/modes';
import type { Message, MessageCitation } from '@/types/conversation';
import { MessageMarkdown } from '@/components/dashboard/message-markdown';
import { ComposerAttachments } from '@/components/dashboard/composer-attachments';
import type { ConversationAttachment } from '@/services/repositories/conversation-attachments-repo';

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
          <span className="inline-flex max-w-[16rem] items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted-foreground" title={`${c.sourceTitle || 'Source'} (${c.recordId})`}>
            <FileText className="size-3 shrink-0 text-primary" /> <span className="truncate">{c.sourceTitle || c.recordId}</span>
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
  specialistSlug,
  initialMessages,
  remembered,
  attachments = [],
  voice = { sttConfigured: false, ttsConfigured: false },
}: {
  conversationId: string;
  agentName: string;
  agentTitle?: string;
  /** Drives the voice-mode permission matrix (Makela never gets V-V). */
  specialistSlug?: string;
  initialMessages: Message[];
  remembered: string[];
  attachments?: ConversationAttachment[];
  /** Real server-side voice configuration — controls stay honest when unset. */
  voice?: { sttConfigured: boolean; ttsConfigured: boolean };
}) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = React.useState<string | null>(null);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attachmentBusy, setAttachmentBusy] = React.useState(false);
  const [rated, setRated] = React.useState<Record<string, 'up' | 'down'>>({});
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Communication modes — same thread whatever the mode; switching never
  // resets the conversation. V-V exists only for non-receptionist specialists.
  const modes = voiceModesFor(specialistSlug);
  const [mode, setMode] = React.useState<VoiceMode>('ts');
  const modeRef = React.useRef<VoiceMode>('ts');
  modeRef.current = mode;
  const replyAudio = useReplyAudio();
  const voiceLoop = useVoiceLoop({
    endpoint: '/api/voice/transcribe',
    onTranscript: (text) => {
      void send(text);
    },
    onError: (message) => setError(message),
  });
  const voiceLoopRef = React.useRef(voiceLoop);
  voiceLoopRef.current = voiceLoop;

  function switchMode(next: VoiceMode) {
    setMode(next);
    replyAudio.stop();
    voiceLoopRef.current.stop();
    if (next === 'vv') void voiceLoopRef.current.start();
  }

  /** Speak a stored reply; in V-V, resume listening once playback ends. */
  async function speakReply(messageId: string) {
    if (!voice.ttsConfigured) return;
    await replyAudio.play(() =>
      fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      }),
    );
    // Re-arm the mic ONLY after the AI has finished speaking, so the
    // microphone can never capture the AI's own voice.
    if (modeRef.current === 'vv') void voiceLoopRef.current.start();
  }

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
            // T-T / V-V: speak the reply once it is fully stored (server ids only).
            if (modeRef.current !== 'ts' && !finalMsg.id.startsWith('srv_') && !finalMsg.id.startsWith('local_')) {
              void speakReply(finalMsg.id);
            } else if (modeRef.current === 'vv') {
              void voiceLoopRef.current.start();
            }
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

  async function copyReply(text: string) {
    try { await navigator.clipboard.writeText(text); } catch { setError('Copy is unavailable in this browser.'); }
  }

  function regenerate() {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    if (last) void send(last.content);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
      {/* Active specialist header + communication-mode switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted/60 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#12233a] font-serif text-sm text-[#c9a961]">{agentName.charAt(0)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{agentName}</p>
            {agentTitle && <p className="truncate text-xs text-muted-foreground">{agentTitle}</p>}
          </div>
        </div>
        <VoiceModeSwitch
          modes={modes}
          mode={mode}
          onChange={switchMode}
          providers={{ stt: voice.sttConfigured, tts: voice.ttsConfigured }}
        />
      </div>

      {remembered.length > 0 && (
        <div className="border-b border-border bg-surface-muted px-5 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Remembered for you:</span> {remembered.join(' · ')}
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-8">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-1">
            <div className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={msg.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground' : msg.role === 'system' ? 'max-w-[90%] rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-foreground' : 'max-w-[85%] text-sm leading-7 text-foreground'}>
                {msg.role === 'assistant' ? <MessageMarkdown text={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
              </div>
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
              <div className="flex items-center gap-1 pl-1">
                <button type="button" aria-label="Helpful" onClick={() => rate(msg.id, 'up')} className={`rounded p-1 ${rated[msg.id] === 'up' ? 'text-secondary' : 'text-muted-foreground hover:text-foreground'}`}>
                  <ThumbsUp className="size-3.5" />
                </button>
                <button type="button" aria-label="Not helpful" onClick={() => rate(msg.id, 'down')} className={`rounded p-1 ${rated[msg.id] === 'down' ? 'text-danger' : 'text-muted-foreground hover:text-foreground'}`}>
                  <ThumbsDown className="size-3.5" />
                </button>
                {voice.ttsConfigured && <SpeakButton messageId={msg.id} />}
                <button type="button" aria-label="Copy response" onClick={() => void copyReply(msg.content)} className="rounded p-1 text-muted-foreground hover:text-foreground"><Copy className="size-3.5" /></button>
                {msg.id === [...messages].reverse().find((m) => m.role === 'assistant')?.id && <button type="button" aria-label="Regenerate response" onClick={regenerate} className="rounded p-1 text-muted-foreground hover:text-foreground"><RefreshCw className="size-3.5" /></button>}
              </div>
            )}
          </div>
        ))}
        {streaming !== null && (
          <div className="flex justify-start">
            <div className="max-w-[85%] text-sm leading-7 text-foreground">{streaming ? <MessageMarkdown text={streaming} /> : <span className="text-muted-foreground">{agentName} is thinking…</span>}</div>
          </div>
        )}

        {/* Voice-state indicators — integrated into the thread, never replacing it. */}
        {voiceLoop.phase === 'listening' && (
          <p className="flex items-center gap-2 pl-1 text-xs text-muted-foreground" role="status">
            <Mic className="size-3.5 text-primary motion-safe:animate-pulse" /> Listening — pause when you have finished speaking.
            <button type="button" onClick={() => voiceLoop.stop()} className="underline underline-offset-2 hover:text-foreground">
              Stop
            </button>
          </p>
        )}
        {voiceLoop.phase === 'processing' && (
          <p className="flex items-center gap-2 pl-1 text-xs text-muted-foreground" role="status">
            <Mic className="size-3.5" /> Transcribing…
          </p>
        )}
        {replyAudio.state === 'playing' && (
          <p className="flex items-center gap-2 pl-1 text-xs text-muted-foreground" role="status">
            <Volume2 className="size-3.5 text-primary motion-safe:animate-pulse" /> {agentName} is speaking…
            <button type="button" onClick={() => replyAudio.stop()} className="underline underline-offset-2 hover:text-foreground">
              Stop
            </button>
          </p>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface/95 p-3 backdrop-blur sm:p-4">
        {error && <p className="mb-2 text-sm text-danger" role="alert">{error}</p>}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface-muted/40 p-2 shadow-sm">
          <ComposerAttachments conversationId={conversationId} files={attachments} disabled={busy || attachmentBusy} onBusy={setAttachmentBusy} />
          <div className="flex items-end gap-2 pt-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            placeholder={`Message ${agentName}…`}
            aria-label="Your message"
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
          />
          <VoiceInputButton
            enabled={voice.sttConfigured}
            disabled={busy}
            onTranscript={(text) => setInput((current) => (current ? `${current} ${text}` : text))}
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
          </div>
        </form>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button type="button" intent="ghost" size="sm" onClick={requestSupport} disabled={busy}>
            <LifeBuoy className="size-4" /> Request human support
          </Button>
          <p className="text-right text-xs text-muted-foreground">
            {!voice.sttConfigured && 'Voice is not connected yet — the microphone activates once the speech service is configured. '}
            AI-generated, not clinically reviewed. Not for emergencies — call your local emergency services.
          </p>
        </div>
      </div>
    </div>
  );
}
