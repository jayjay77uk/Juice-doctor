'use client';

import * as React from 'react';
import Link from 'next/link';
import { Camera, Upload, ShieldCheck, RefreshCw, ArrowRight, Loader2 } from 'lucide-react';
import { routes } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * Remote Selfie Scan — an interactive MOCK. Everything is client-side: no image
 * is uploaded, stored or sent. The "processing" is simulated and the result is a
 * clearly-labelled sample. In Phase 2, only the processing/result step is
 * replaced by real inference; this UI and its consent copy are production shapes.
 */

type Step = 'capture' | 'processing' | 'result';

interface PillarScore {
  label: string;
  value: number;
}

const questions = [
  { name: 'energy', label: 'How are your energy levels lately?' },
  { name: 'sleep', label: 'How well have you been sleeping?' },
  { name: 'hydration', label: 'How much water do you usually drink?' },
] as const;

const options = [
  { value: 4, label: 'Great' },
  { value: 3, label: 'Okay' },
  { value: 2, label: 'Not great' },
  { value: 1, label: 'Struggling' },
];

const processingStages = [
  'Reading your snapshot…',
  'Mapping the HERNE pillars…',
  'Preparing your indicative reading…',
];

export function SelfieScanFlow() {
  const [step, setStep] = React.useState<Step>('capture');
  const [preview, setPreview] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [stageIndex, setStageIndex] = React.useState(0);
  const [scores, setScores] = React.useState<PillarScore[]>([]);
  const [overall, setOverall] = React.useState(0);

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    // Local preview only — the object URL never leaves the browser.
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }

  function startScan() {
    setStep('processing');
    setStageIndex(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      if (i >= processingStages.length) {
        clearInterval(timer);
        finishScan();
      } else {
        setStageIndex(i);
      }
    }, 900);
  }

  function finishScan() {
    const base = (name: string) => (answers[name] ?? 3) * 20 + 10;
    const jitter = () => Math.round((Math.random() - 0.5) * 12);
    const next: PillarScore[] = [
      { label: 'Hydration', value: clamp(base('hydration') + jitter()) },
      { label: 'Rest', value: clamp(base('sleep') + jitter()) },
      { label: 'Energy', value: clamp(base('energy') + jitter()) },
      { label: 'Nutrition', value: clamp(64 + jitter()) },
      { label: 'Elimination', value: clamp(60 + jitter()) },
    ];
    setScores(next);
    setOverall(Math.round(next.reduce((sum, s) => sum + s.value, 0) / next.length));
    setStep('result');
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setAnswers({});
    setScores([]);
    setStep('capture');
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)]">
      {/* Consent bar */}
      <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-6 py-3 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-secondary" />
        Private by design — in this prototype nothing is uploaded, stored, or sent.
      </div>

      <div className="p-6 sm:p-8">
        {step === 'capture' && (
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col gap-4">
              <label
                className={cn(
                  'group relative flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-border-strong bg-cream-50 text-center transition-colors hover:border-primary',
                )}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Your selected photo preview" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <>
                    <span className="grid size-14 place-items-center rounded-full bg-teal-100 text-primary">
                      <Camera className="size-6" />
                    </span>
                    <span className="font-medium text-foreground">Position your camera</span>
                    <span className="text-sm text-muted-foreground">or upload a photo to begin</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="user" onChange={onFile} className="sr-only" />
                <span className="absolute bottom-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-crisp)]">
                  <Upload className="size-3.5" /> {preview ? 'Change photo' : 'Choose photo'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className={cn('text-sm text-muted-foreground underline-offset-2 hover:underline', !preview && 'invisible')}
              >
                Remove photo — you can scan without one
              </button>
            </div>

            <div className="flex flex-col gap-6">
              <p className="text-muted-foreground">
                Answer three quick questions and we’ll generate an indicative wellbeing snapshot.
              </p>
              {questions.map((q) => (
                <fieldset key={q.name} className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-medium text-foreground">{q.label}</legend>
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt) => {
                      const selected = answers[q.name] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setAnswers((a) => ({ ...a, [q.name]: opt.value }))}
                          className={cn(
                            'rounded-full border px-4 py-2 text-sm transition-colors',
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border-strong bg-surface text-foreground hover:bg-surface-muted',
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <Button
                type="button"
                size="lg"
                onClick={startScan}
                disabled={Object.keys(answers).length < questions.length}
              >
                Generate my snapshot <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-teal-100 text-primary">
              <Loader2 className="size-7 animate-spin" />
            </span>
            <p className="font-serif text-xl text-foreground" aria-live="polite">
              {processingStages[stageIndex]}
            </p>
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-[var(--ease-standard)]"
                style={{ width: `${((stageIndex + 1) / processingStages.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong">
                Sample result — not a medical assessment
              </span>
              <p className="mt-2 font-serif text-5xl text-primary">{overall}</p>
              <p className="text-muted-foreground">Your indicative wellbeing score</p>
            </div>

            <ul className="flex flex-col gap-3">
              {scores.map((s) => (
                <li key={s.label} className="flex items-center gap-4">
                  <span className="w-24 shrink-0 text-sm font-medium text-foreground">{s.label}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full bg-secondary"
                      style={{ width: `${s.value}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                    {s.value}
                  </span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl bg-surface-muted p-5">
              <p className="font-medium text-foreground">Your recommended next step</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A full Body MOT will turn this indicative snapshot into a precise, personalised plan.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link href={routes.bodyMot.href}>
                    Explore the Body MOT <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button type="button" intent="ghost" onClick={reset}>
                  <RefreshCw className="size-4" /> Start over
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function clamp(n: number): number {
  return Math.max(18, Math.min(96, Math.round(n)));
}
