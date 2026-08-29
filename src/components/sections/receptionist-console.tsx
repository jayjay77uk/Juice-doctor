'use client';

import * as React from 'react';
import { Send, Sparkles, ShieldAlert, CheckCircle2, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import {
  receptionistTurnAction,
  receptionistLeadAction,
  receptionistWhatsappAction,
} from '@/services/receptionist-actions';
import { VoiceInputButton, useReplyAudio } from '@/components/dashboard/voice-controls';
import type { ConversationTurn, ReceptionistRecommendation } from '@/types/crm';

/**
 * Makela — the public wellbeing concierge, as a ChatGPT-style conversation.
 * One continuous thread, a persistent composer, streaming-feel typing
 * indicator, voice input (T-S) and spoken replies (T-T). Makela deliberately
 * has NO hands-free voice-to-voice mode — that is a specialist capability.
 * Routing/escalation appears inline in the thread; the contact card is a
 * compact step inside the conversation, never a replacement for it.
 */

export interface ReceptionistConsoleSettings {
  active: boolean;
  greeting: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
}

export interface ReceptionistVoice {
  sttConfigured: boolean;
  ttsConfigured: boolean;
}

const now = () => new Date().toISOString();

export function ReceptionistConsole({
  settings,
  signedIn = false,
  voice = { sttConfigured: false, ttsConfigured: false },
}: {
  settings: ReceptionistConsoleSettings;
  signedIn?: boolean;
  voice?: ReceptionistVoice;
}) {
  const [turns, setTurns] = React.useState<ConversationTurn[]>(() => [
    { role: 'receptionist', text: settings.greeting, at: now() },
  ]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Routing state — set when Makela recommends or escalates.
  const [recommendation, setRecommendation] = React.useState<ReceptionistRecommendation | null>(null);
  const [summary, setSummary] = React.useState('');
  const [contact, setContact] = React.useState({ name: '', email: '', whatsapp: '' });
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [leadId, setLeadId] = React.useState<string | null>(null);
  const [leadEscalated, setLeadEscalated] = React.useState(false);

  // T-T: speak Makela's replies aloud (signed replies only; specialists own V-V).
  const [spokenReplies, setSpokenReplies] = React.useState(false);
  const replyAudio = useReplyAudio();

  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy, recommendation, leadId]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput('');
    const visitorTurn: ConversationTurn = { role: 'visitor', text: content, at: now() };
    const conversation = [...turns, visitorTurn];
    setTurns(conversation);
    setBusy(true);
    const res = await receptionistTurnAction({ conversation });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTurns((ts) => [...ts, { role: 'receptionist', text: res.reply, at: now() }]);
    if (res.action !== 'continue' && res.recommendation) {
      setRecommendation(res.recommendation);
      setSummary(res.summary ?? '');
    }
    if (spokenReplies && voice.ttsConfigured && res.replySig) {
      void replyAudio.play(() =>
        fetch('/api/voice/receptionist-speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: res.reply, sig: res.replySig }),
        }),
      );
    }
  }

  async function submitContact(event: React.FormEvent) {
    event.preventDefault();
    if (!recommendation || busy) return;
    setBusy(true);
    setFieldErrors({});
    setError(null);
    const res = await receptionistLeadAction({
      name: contact.name,
      email: contact.email,
      whatsapp: contact.whatsapp,
      conversation: turns,
      answers: [],
      summary,
      recommendation,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }
    setLeadId(res.leadId);
    setLeadEscalated(res.escalated);
  }

  async function requestWhatsapp() {
    if (leadId) await receptionistWhatsappAction(leadId);
    const number = settings.whatsappNumber.replace(/[^0-9]/g, '');
    if (number) window.open(`https://wa.me/${number}`, '_blank', 'noopener');
  }

  if (!settings.active) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <h2 className="text-h3 text-foreground">The AI receptionist is offline</h2>
        <p className="mt-2 text-muted-foreground">
          Please leave a message on the contact page and a member of the team will get back to you.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-soft)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Makela</p>
            <p className="text-xs text-muted-foreground">Your wellbeing concierge</p>
          </div>
        </div>
        {/* T-T toggle — Makela supports spoken replies, never hands-free V-V. */}
        <button
          type="button"
          onClick={() => {
            if (spokenReplies) replyAudio.stop();
            setSpokenReplies((v) => !v);
          }}
          disabled={!voice.ttsConfigured}
          aria-pressed={spokenReplies}
          title={
            voice.ttsConfigured
              ? spokenReplies
                ? 'Spoken replies are on'
                : 'Speak Makela’s replies aloud'
              : 'Spoken replies are not available yet — the voice service is not connected.'
          }
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            spokenReplies
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground disabled:opacity-50'
          }`}
        >
          {spokenReplies ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          Voice replies
        </button>
      </div>
      <p className="border-b border-border bg-surface-muted/50 px-5 py-2.5 text-xs text-muted-foreground">
        AI-generated, not clinically reviewed. Not for emergencies — if you need urgent help, call your local emergency services.
      </p>

      {/* Conversation thread */}
      <div ref={scrollRef} className="flex max-h-[30rem] min-h-[16rem] flex-col gap-3 overflow-y-auto px-5 py-6">
        {turns.map((turn, i) => (
          <Bubble key={i} role={turn.role} text={turn.text} />
        ))}
        {busy && !recommendation && <TypingIndicator />}
        {busy && recommendation && !leadId && <TypingIndicator />}
        {replyAudio.state === 'playing' && (
          <p className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
            <Volume2 className="size-3.5 text-primary motion-safe:animate-pulse" /> Makela is speaking…
          </p>
        )}

        {recommendation && (
          <div className="flex flex-col gap-3">
            <RecommendationCard recommendation={recommendation} />
            {signedIn && !recommendation.escalate && (
              <a
                href="/dashboard/specialists"
                className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Continue with {recommendation.specialistName} in your dashboard →
              </a>
            )}
            {!leadId ? (
              <form onSubmit={submitContact} className="rounded-2xl border border-border bg-surface-muted/60 p-4" noValidate>
                <p className="mb-3 text-sm text-muted-foreground">
                  Leave your details and {recommendation.escalate ? 'a member of the team will get back to you.' : 'we will set you up.'}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" name="name" required error={fieldErrors.name?.[0]}>
                    <Input id="name" name="name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} />
                  </Field>
                  <Field label="Email" name="email" required error={fieldErrors.email?.[0]}>
                    <Input id="email" name="email" type="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="WhatsApp number" name="whatsapp" hint="Optional — for a direct handoff.">
                    <Input id="whatsapp" name="whatsapp" value={contact.whatsapp} onChange={(e) => setContact((c) => ({ ...c, whatsapp: e.target.value }))} />
                  </Field>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Button type="submit" size="sm" disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit'}
                  </Button>
                  <p className="text-xs text-muted-foreground">Saved securely; the team will follow up.</p>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 rounded-xl bg-surface-muted px-4 py-3">
                  {leadEscalated ? (
                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />
                  )}
                  <p className="text-sm text-foreground">
                    {leadEscalated
                      ? 'Human review required — a member of the team will review your conversation and get back to you.'
                      : 'All set — we have saved your conversation and recommendation.'}
                  </p>
                </div>
                {settings.whatsappEnabled && (
                  <Button type="button" intent="ghost" size="sm" onClick={requestWhatsapp} className="self-start">
                    <MessageCircle className="size-4" /> Continue on WhatsApp
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent composer — the conversation continues even after routing. */}
      <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && (
          <p className="mb-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Message Makela…"
            aria-label="Message Makela"
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
          />
          <VoiceInputButton
            enabled={voice.sttConfigured}
            disabled={busy}
            endpoint="/api/voice/receptionist-transcribe"
            onTranscript={(text) => setInput((current) => (current ? `${current} ${text}` : text))}
          />
          <Button type="submit" size="sm" disabled={busy || !input.trim()} aria-label="Send message">
            <Send className="size-4" />
          </Button>
        </form>
        {!voice.sttConfigured && (
          <p className="mt-2 text-xs text-muted-foreground">Voice is not connected yet — the microphone activates once the speech service is configured.</p>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="Makela is typing" role="status">
      <span className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-surface-muted px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

function Bubble({ role, text }: { role: 'visitor' | 'receptionist'; text: string }) {
  const isVisitor = role === 'visitor';
  return (
    <div className={isVisitor ? 'flex justify-end' : 'flex justify-start'}>
      <p
        className={
          isVisitor
            ? 'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground'
            : 'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-surface-muted px-4 py-2.5 text-sm text-foreground'
        }
      >
        {text}
      </p>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: ReceptionistRecommendation }) {
  const pct = Math.round(recommendation.confidence * 100);
  return (
    <div className="rounded-2xl border border-border bg-surface-muted p-4">
      {recommendation.escalate ? (
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldAlert className="size-4 text-amber-600" aria-hidden /> Passed to the team for human review
        </p>
      ) : (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommended specialist</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="size-4 text-secondary" aria-hidden />
            {recommendation.specialistName}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <span className="mt-1 block h-2 w-full overflow-hidden rounded-full bg-surface">
            <span className="block h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
          </span>
          {recommendation.alternatives.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Other possible matches: {recommendation.alternatives.map((a) => a.name).join(', ')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
