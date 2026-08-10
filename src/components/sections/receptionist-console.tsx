'use client';

import * as React from 'react';
import { Send, Sparkles, ShieldAlert, CheckCircle2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import {
  receptionistAssessAction,
  receptionistLeadAction,
  receptionistWhatsappAction,
} from '@/services/receptionist-actions';
import type { ConsultAnswer, ConversationTurn, ReceptionistRecommendation } from '@/types/crm';

export interface ReceptionistConsoleSettings {
  active: boolean;
  greeting: string;
  questions: { id: string; prompt: string; quickReplies: { value: string; label: string }[] }[];
  whatsappEnabled: boolean;
  whatsappNumber: string;
}

type Phase = 'chat' | 'assessing' | 'contact' | 'done';

const now = () => new Date().toISOString();

export function ReceptionistConsole({ settings }: { settings: ReceptionistConsoleSettings }) {
  const [turns, setTurns] = React.useState<ConversationTurn[]>(() => {
    const list: ConversationTurn[] = [{ role: 'receptionist', text: settings.greeting, at: now() }];
    const first = settings.questions[0];
    if (first) list.push({ role: 'receptionist', text: first.prompt, at: now() });
    return list;
  });
  const [qIndex, setQIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<ConsultAnswer[]>([]);
  const [phase, setPhase] = React.useState<Phase>('chat');
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [recommendation, setRecommendation] = React.useState<ReceptionistRecommendation | null>(null);
  const [summary, setSummary] = React.useState('');

  const [contact, setContact] = React.useState({ name: '', email: '', whatsapp: '' });
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [leadId, setLeadId] = React.useState<string | null>(null);
  const [escalated, setEscalated] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, phase]);

  const currentQuestion = settings.questions[qIndex];

  async function submitAnswer(text: string) {
    const q = settings.questions[qIndex];
    if (!q || !text.trim() || busy) return;
    setError(null);
    const visitorTurn: ConversationTurn = { role: 'visitor', text: text.trim(), at: now() };
    const nextAnswers = [...answers, { id: q.id, prompt: q.prompt, answer: text.trim() }];
    setAnswers(nextAnswers);
    setInput('');

    const isLast = qIndex >= settings.questions.length - 1;
    if (!isLast) {
      const next = settings.questions[qIndex + 1];
      setTurns((ts) => [
        ...ts,
        visitorTurn,
        ...(next ? [{ role: 'receptionist' as const, text: next.prompt, at: now() }] : []),
      ]);
      setQIndex(qIndex + 1);
      return;
    }

    // Last answer — run the live AI assessment on the server.
    const convo = [...turns, visitorTurn];
    setTurns((ts) => [...ts, visitorTurn]);
    setPhase('assessing');
    setBusy(true);
    const res = await receptionistAssessAction({ conversation: convo, answers: nextAnswers });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setPhase('chat');
      return;
    }
    setRecommendation(res.recommendation);
    setSummary(res.summary);
    const recText = res.recommendation.escalate
      ? 'Thank you. I would like a member of the team to look at this and get back to you. Please leave your contact details below.'
      : `Thank you. Based on what you told me, ${res.recommendation.specialistName} looks like the best fit (confidence ${Math.round(res.recommendation.confidence * 100)}%). Leave your details below and we will set you up.`;
    setTurns((ts) => [...ts, { role: 'receptionist', text: recText, at: now() }]);
    setPhase('contact');
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
      answers,
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
    setEscalated(res.escalated);
    setPhase('done');
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
      <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-5 py-4">
        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">Makela</p>
          <p className="text-xs text-muted-foreground">Your wellbeing concierge</p>
        </div>
      </div>
      <p className="border-b border-border bg-surface-muted/50 px-5 py-2.5 text-xs text-muted-foreground">
        AI-generated, not clinically reviewed. Not for emergencies — if you need urgent help, call your local emergency services.
      </p>

      {/* Conversation */}
      <div ref={scrollRef} className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto px-5 py-6">
        {turns.map((turn, i) => (
          <Bubble key={i} role={turn.role} text={turn.text} />
        ))}
        {phase === 'assessing' && <Bubble role="receptionist" text="Thinking…" />}

        {(phase === 'contact' || phase === 'done') && recommendation && (
          <RecommendationCard recommendation={recommendation} />
        )}
      </div>

      {/* Input / forms */}
      <div className="border-t border-border p-5">
        {error && (
          <p className="mb-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {phase === 'chat' && currentQuestion && (
          <div className="flex flex-col gap-3">
            {currentQuestion.quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentQuestion.quickReplies.map((reply) => (
                  <button
                    key={reply.value}
                    type="button"
                    onClick={() => submitAnswer(reply.label)}
                    disabled={busy}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitAnswer(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitAnswer(input);
                  }
                }}
                rows={2}
                placeholder="Tell us what you need help with…"
                aria-label="Your message"
                className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
              />
              <Button type="submit" size="sm" disabled={busy || !input.trim()} aria-label="Send message">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        )}

        {phase === 'contact' && (
          <form onSubmit={submitContact} className="flex flex-col gap-4" noValidate>
            <p className="text-sm text-muted-foreground">Contact details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" name="name" required error={fieldErrors.name?.[0]}>
                <Input
                  id="name"
                  name="name"
                  value={contact.name}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                />
              </Field>
              <Field label="Email" name="email" required error={fieldErrors.email?.[0]}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="WhatsApp number" name="whatsapp" hint="Optional — for a direct handoff.">
              <Input
                id="whatsapp"
                name="whatsapp"
                value={contact.whatsapp}
                onChange={(e) => setContact((c) => ({ ...c, whatsapp: e.target.value }))}
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit'}
              </Button>
              <p className="text-xs text-muted-foreground">Your details are saved securely and a member of the team will follow up.</p>
            </div>
          </form>
        )}

        {phase === 'done' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-xl bg-surface-muted px-4 py-3">
              {escalated ? (
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
              ) : (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden />
              )}
              <p className="text-sm text-foreground">
                {escalated
                  ? 'Human review required — a member of the team will review your conversation and get back to you.'
                  : 'All set — we have saved your conversation and recommendation.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.whatsappEnabled && (
                <Button type="button" intent="ghost" onClick={requestWhatsapp}>
                  <MessageCircle className="size-4" /> Continue on WhatsApp
                </Button>
              )}
              <Button type="button" intent="ghost" onClick={() => window.location.reload()}>
                Start a new conversation
              </Button>
            </div>
          </div>
        )}
      </div>
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
            ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground'
            : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-muted px-4 py-2.5 text-sm text-foreground'
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
          <ShieldAlert className="size-4 text-amber-600" aria-hidden /> Human review required
        </p>
      ) : (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommended AI</p>
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
