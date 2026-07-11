'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ArrowLeft, Loader2, Check, MessageCircle, UserRoundCheck, ShieldAlert } from 'lucide-react';
import { receptionistConsultAction, receptionistLeadAction } from '@/services/receptionist-actions';
import type { ReceptionistRecommendation } from '@/types/crm';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export interface ConsoleQuestion {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}
export interface ConsoleSpecialist {
  slug: string;
  name: string;
  tagline: string;
  priceLabel: string;
}

type Phase = 'intro' | 'question' | 'thinking' | 'recommendation' | 'details' | 'done';

const WHATSAPP = 'https://wa.me/447700900000';

function confidenceTone(c: number): string {
  return c >= 0.75 ? 'bg-secondary' : c >= 0.6 ? 'bg-amber-500' : 'bg-danger';
}

/**
 * The Receptionist AI — the front door of the business. Consults the visitor,
 * recommends a specialist AI with a confidence score, captures the lead, and
 * either routes to a subscription / WhatsApp or escalates to a human expert when
 * confidence is low. Prototype: rule-based, no real inference; nothing is sent.
 */
export function ReceptionistConsole({
  questions,
  specialists,
}: {
  questions: ConsoleQuestion[];
  specialists: ConsoleSpecialist[];
}) {
  const [phase, setPhase] = React.useState<Phase>('intro');
  const [qIndex, setQIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [rec, setRec] = React.useState<ReceptionistRecommendation | null>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [whatsapp, setWhatsapp] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const question = questions[qIndex];
  const specialist = rec ? specialists.find((s) => s.slug === rec.specialistSlug) ?? null : null;

  async function answer(value: string) {
    if (!question) return;
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      return;
    }
    // Last question answered — consult the receptionist.
    setPhase('thinking');
    const res = await receptionistConsultAction(nextAnswers);
    if (res.ok) {
      setRec(res.recommendation);
      setPhase('recommendation');
    } else {
      setError(res.error);
      setPhase('recommendation');
    }
  }

  async function submitLead() {
    if (!rec) return;
    setPending(true);
    setError(null);
    const res = await receptionistLeadAction({ name, email, whatsapp, answers, recommendation: rec });
    setPending(false);
    if (res.ok) setPhase('done');
    else setError(res.error);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        {/* Receptionist header */}
        <div className="flex items-center gap-3 border-b border-border bg-teal-800 px-6 py-4 text-cream-50">
          <span className="grid size-10 place-items-center rounded-full bg-white/12">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="font-serif text-lg">The Receptionist</p>
            <p className="text-xs text-cream-200">Your AI front desk · finds your specialist</p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {phase === 'intro' && (
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-h3 text-foreground">Let’s find the right specialist for you</h2>
              <p className="measure mx-auto text-muted-foreground">
                Three quick questions and I’ll match you with the AI specialist that fits — or connect
                you with our human expert if that’s the better call. (Prototype: nothing is stored.)
              </p>
              <Button size="lg" onClick={() => setPhase('question')} className="mx-auto mt-2">
                Start <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {phase === 'question' && question && (
            <div className="flex flex-col gap-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Question {qIndex + 1} of {questions.length}
              </p>
              <h2 className="text-h3 text-foreground">{question.label}</h2>
              <div className="flex flex-col gap-2.5">
                {question.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => answer(opt.value)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors',
                      answers[question.id] === opt.value ? 'border-primary bg-teal-50' : 'border-border hover:bg-surface-muted',
                    )}
                  >
                    <span className="font-medium text-foreground">{opt.label}</span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
              {qIndex > 0 && (
                <button type="button" onClick={() => setQIndex((i) => i - 1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-4" /> Back
                </button>
              )}
            </div>
          )}

          {phase === 'thinking' && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="font-serif text-lg text-foreground">Finding your match…</p>
            </div>
          )}

          {phase === 'recommendation' && rec && (
            <div className="flex flex-col gap-5">
              {rec.escalate ? (
                <div className="flex flex-col gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
                    <ShieldAlert className="size-6" />
                  </span>
                  <h2 className="text-h3 text-foreground">Let’s get you a human expert</h2>
                  <p className="text-muted-foreground">{rec.reasoning}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-teal-100 text-primary">
                    <UserRoundCheck className="size-6" />
                  </span>
                  <h2 className="text-h3 text-foreground">
                    I recommend <span className="text-primary">{rec.specialistName}</span>
                  </h2>
                  {specialist && <p className="text-muted-foreground">{specialist.tagline}</p>}
                  <p className="text-muted-foreground">{rec.reasoning}</p>
                </div>
              )}

              {/* Confidence */}
              <div className="rounded-xl bg-surface-muted p-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Recommendation confidence</span>
                  <span className="tabular-nums text-muted-foreground">{Math.round(rec.confidence * 100)}%</span>
                </div>
                <span className="block h-2 overflow-hidden rounded-full bg-surface">
                  <span className={cn('block h-full rounded-full', confidenceTone(rec.confidence))} style={{ width: `${Math.round(rec.confidence * 100)}%` }} />
                </span>
                {rec.escalate && (
                  <p className="mt-2 text-xs text-muted-foreground">Below our confidence threshold — routing to a human.</p>
                )}
              </div>

              <Button size="lg" onClick={() => setPhase('details')}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {phase === 'details' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-h3 text-foreground">Where shall we send this?</h2>
                <p className="text-muted-foreground">So we can set you up or have our expert reach out.</p>
              </div>
              <Field label="Your name" name="name" required>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
              <Field label="Email" name="email" required>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </Field>
              <Field label="WhatsApp (optional)" name="whatsapp" hint="For a faster, personal handoff.">
                <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+44 …" />
              </Field>
              {error && <p className="text-sm text-danger" role="alert">{error}</p>}
              <Button size="lg" onClick={submitLead} disabled={pending || !name || !email}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {pending ? 'Saving…' : 'Create my match'}
              </Button>
            </div>
          )}

          {phase === 'done' && rec && (
            <div className="flex flex-col gap-5">
              <span className="grid size-12 place-items-center rounded-full bg-green-100 text-secondary">
                <Check className="size-6" />
              </span>
              {rec.escalate ? (
                <div className="flex flex-col gap-2">
                  <h2 className="text-h3 text-foreground">Our expert will be in touch</h2>
                  <p className="text-muted-foreground">
                    We’ve created your enquiry and flagged it for {`Erran Warden`}, our human expert, who
                    will personally reach out. (Prototype: no message is actually sent.)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <h2 className="text-h3 text-foreground">You’re matched with {rec.specialistName}</h2>
                  <p className="text-muted-foreground">
                    We’ve created your lead in our CRM. Start your subscription below, or continue on
                    WhatsApp for a personal handoff. (Prototype: nothing is charged or stored.)
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {!rec.escalate && specialist && (
                  <Button asChild size="lg">
                    <Link href={`/specialists/${specialist.slug}`}>
                      Subscribe to {specialist.name} <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}
                <Button asChild size="lg" intent="outline">
                  <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" /> Continue on WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Prototype — the Receptionist AI is simulated (rule-based, no real AI). No data is stored or sent.
      </p>
    </div>
  );
}
