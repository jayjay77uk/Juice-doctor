'use client';

import * as React from 'react';
import { Play, Loader2, FileText, Clock, Coins, Cpu } from 'lucide-react';
import { runPlaygroundAction } from '@/services/admin-actions';
import type { PlaygroundResult } from '@/types/ai-platform';
import { Field, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HERNE_LANGUAGES } from '@/data/herne/languages';
import { Panel } from './panel';

export interface PlaygroundAgentOption {
  id: string;
  name: string;
}

/**
 * The AI Playground — a LIVE, isolated test harness. Selecting a specialist,
 * language and question runs `runPlaygroundAction`, which for HERNE specialists
 * calls the real assembly (shared DNA, scored evidence, citations, safety,
 * language) through the configured provider and shows full inspection. Runs are
 * logged as playground traffic and never affect published configuration.
 */
export function PlaygroundConsole({ agents }: { agents: PlaygroundAgentOption[] }) {
  const [agentId, setAgentId] = React.useState(agents[0]?.id ?? '');
  const [knowledgeCount, setKnowledgeCount] = React.useState('2');
  const [language, setLanguage] = React.useState('en-GB');
  const [query, setQuery] = React.useState('How much water should I actually drink?');
  const [result, setResult] = React.useState<PlaygroundResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function run() {
    setPending(true);
    setError(null);
    const res = await runPlaygroundAction({
      agentId,
      query,
      knowledgeCount: Number(knowledgeCount),
      language,
    });
    setPending(false);
    if (res.ok) setResult(res.result);
    else setError(res.error);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Panel title="Test configuration">
        <div className="flex flex-col gap-5">
          <Field label="Agent" name="agent">
            <Select id="agent" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Knowledge sources" name="knowledge" hint="How many documents to retrieve.">
            <Select id="knowledge" value={knowledgeCount} onChange={(e) => setKnowledgeCount(e.target.value)}>
              <option value="0">None</option>
              <option value="1">1 document</option>
              <option value="2">2 documents</option>
              <option value="3">3 documents</option>
            </Select>
          </Field>
          <Field label="Language" name="language" hint="Answer language (HERNE specialists).">
            <Select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {HERNE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.englishName}{l.nativeName !== l.englishName ? ` — ${l.nativeName}` : ''}</option>
              ))}
            </Select>
          </Field>
          <Field label="Test question" name="query">
            <Textarea id="query" value={query} onChange={(e) => setQuery(e.target.value)} rows={4} />
          </Field>
          <Button type="button" onClick={run} disabled={pending || !agentId}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {pending ? 'Running…' : 'Run live test'}
          </Button>
          {error && (
            <p className="rounded-lg bg-[#f6e3e0] px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Live — HERNE specialists run the real assembly through the configured provider. Runs are logged as playground traffic and never change published configuration.
          </p>
        </div>
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel title="Response">
          {result ? (
            <div className="flex flex-col gap-3">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{result.output}</div>
              {result.isHerne && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <Badge tone={result.grounded ? 'secondary' : 'outline'}>{result.grounded ? 'Grounded in evidence' : 'No evidence matched'}</Badge>
                  {result.escalationRecommended && <Badge tone="accent">Escalation recommended</Badge>}
                  {result.safetyIssues && result.safetyIssues.length > 0 && <Badge tone="accent">Safety: {result.safetyIssues.join(', ')}</Badge>}
                  <Badge tone="neutral">Language: {result.resolvedLanguage}</Badge>
                  {result.promptVersion && <Badge tone="outline">Prompt v{result.promptVersion.version} · {result.promptVersion.status}</Badge>}
                  {typeof result.costUsd === 'number' && <Badge tone="neutral">~${result.costUsd.toFixed(5)}</Badge>}
                </div>
              )}
              {result.isHerne && result.citations && result.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.citations.map((c) => (
                    <span key={c.recordId} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted-foreground" title={c.sourceTitle}>
                      <FileText className="size-3 text-primary" /> {c.recordId}
                    </span>
                  ))}
                </div>
              )}
              {result.escalationRecommended && result.escalationReason && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{result.escalationReason}</p>
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Run a test to see the response.</p>
          )}
        </Panel>

        {result && (
          <>
            <Panel title="Retrieved knowledge" padded={false}>
              {result.retrievedKnowledge.length > 0 ? (
                <ul className="divide-y divide-border">
                  {result.retrievedKnowledge.map((chunk, i) => (
                    <li key={i} className="flex gap-3 px-6 py-4">
                      <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{chunk.documentTitle}</p>
                        <p className="text-sm text-muted-foreground">{chunk.snippet}</p>
                      </div>
                      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                        {(chunk.score * 100).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 py-4 text-sm text-muted-foreground">No knowledge retrieved for this run.</p>
              )}
            </Panel>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: Clock, label: 'Latency', value: `${result.latencyMs} ms` },
                { icon: Coins, label: 'Input tokens', value: result.tokensInput.toLocaleString() },
                { icon: Coins, label: 'Output tokens', value: result.tokensOutput.toLocaleString() },
                { icon: Cpu, label: 'Model', value: result.modelKey },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-border bg-surface p-4">
                  <m.icon className="size-4 text-muted-foreground" />
                  <p className="mt-2 truncate text-sm font-medium text-foreground">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
