'use client';

import * as React from 'react';
import { Play, Loader2, FileText, Clock, Coins, Cpu } from 'lucide-react';
import { runPlaygroundAction } from '@/services/admin-actions';
import type { PlaygroundResult } from '@/types/ai-platform';
import { Field, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Panel } from './panel';

export interface PlaygroundAgentOption {
  id: string;
  name: string;
}

/**
 * The AI Playground — a MOCK test harness. Selecting an agent, knowledge scope
 * and question runs `runPlaygroundAction` (no real inference) and shows the
 * templated response, the retrieved-knowledge citations, and simulated metrics.
 * Nothing here affects production agents or analytics.
 */
export function PlaygroundConsole({ agents }: { agents: PlaygroundAgentOption[] }) {
  const [agentId, setAgentId] = React.useState(agents[0]?.id ?? '');
  const [knowledgeCount, setKnowledgeCount] = React.useState('2');
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
          <Field label="Test question" name="query">
            <Textarea id="query" value={query} onChange={(e) => setQuery(e.target.value)} rows={4} />
          </Field>
          <Button type="button" onClick={run} disabled={pending || !agentId}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {pending ? 'Running…' : 'Run test'}
          </Button>
          {error && (
            <p className="rounded-lg bg-[#f6e3e0] px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Prototype — responses are simulated. No AI model is called and production is unaffected.
          </p>
        </div>
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel title="Response">
          {result ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{result.output}</div>
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
