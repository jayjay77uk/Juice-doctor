import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Run-log repository — records every real AI call to ai_run_logs (the substrate
 * for analytics: usage, tokens, latency, escalations, knowledge use). Best-effort:
 * logging never blocks or fails a user-facing response.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

export interface RunLogInput {
  agentId: string | null;
  input: string;
  output: string;
  retrieved?: unknown[];
  tokensInput?: number | null;
  tokensOutput?: number | null;
  latencyMs?: number | null;
  status?: string;
  isPlayground?: boolean;
  actorId?: string | null;
  /** The provider model actually invoked. */
  model?: string | null;
  /** Estimated USD cost — stored as micro-dollars (usd * 1e6). */
  costUsd?: number | null;
  /** Correlation id from the provider call. */
  traceId?: string | null;
  /** The published prompt version applied, when known. */
  promptVersionId?: string | null;
}

export const runLogRepo = {
  async log(input: RunLogInput): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    try {
      await sb.from('ai_run_logs').insert({
        organisation_id: ORG,
        agent_id: input.agentId,
        actor_id: input.actorId ?? null,
        is_playground: input.isPlayground ?? false,
        input: input.input.slice(0, 4000),
        output: input.output.slice(0, 8000),
        retrieved_knowledge: input.retrieved ?? [],
        tokens_input: input.tokensInput ?? null,
        tokens_output: input.tokensOutput ?? null,
        latency_ms: input.latencyMs ?? null,
        status: input.status ?? 'ok',
        model: input.model ?? null,
        cost_micros: input.costUsd != null ? Math.round(input.costUsd * 1_000_000) : null,
        trace_id: input.traceId ?? null,
        ...(input.promptVersionId ? { prompt_version_id: input.promptVersionId } : {}),
      });
    } catch {
      // best-effort — never surface a logging failure to the caller
    }
  },

  /**
   * Per-user usage counts for a rolling window (daily/monthly limits). Counts
   * only real (non-playground) calls attributed to the user. Returns 0 in preview.
   */
  async userUsage(actorId: string, sinceDays: number): Promise<{ count: number; costMicros: number }> {
    const sb = createAdminClient();
    if (!sb) return { count: 0, costMicros: 0 };
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    const { data } = await sb
      .from('ai_run_logs')
      .select('cost_micros')
      .eq('organisation_id', ORG)
      .eq('actor_id', actorId)
      .eq('is_playground', false)
      .gte('created_at', since);
    const rows = data ?? [];
    return { count: rows.length, costMicros: rows.reduce((a, r) => a + (Number(r.cost_micros) || 0), 0) };
  },

  /** Recent run logs (optionally playground-only), newest first. */
  async recent(limit = 25, opts?: { playgroundOnly?: boolean }): Promise<Record<string, unknown>[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    let query = sb.from('ai_run_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (opts?.playgroundOnly) query = query.eq('is_playground', true);
    const { data } = await query;
    return (data ?? []) as Record<string, unknown>[];
  },

  /** Aggregate stats for analytics (last N days). */
  async stats(sinceDays = 30): Promise<{ total: number; errors: number; avgLatencyMs: number; tokensIn: number; tokensOut: number; costMicros: number }> {
    const sb = createAdminClient();
    if (!sb) return { total: 0, errors: 0, avgLatencyMs: 0, tokensIn: 0, tokensOut: 0, costMicros: 0 };
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    const { data } = await sb
      .from('ai_run_logs')
      .select('status, latency_ms, tokens_input, tokens_output, cost_micros')
      .gte('created_at', since);
    const rows = data ?? [];
    const total = rows.length;
    const errors = rows.filter((r) => r.status !== 'ok').length;
    const latencies = rows.map((r) => Number(r.latency_ms) || 0).filter((n) => n > 0);
    const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const tokensIn = rows.reduce((a, r) => a + (Number(r.tokens_input) || 0), 0);
    const tokensOut = rows.reduce((a, r) => a + (Number(r.tokens_output) || 0), 0);
    const costMicros = rows.reduce((a, r) => a + (Number(r.cost_micros) || 0), 0);
    return { total, errors, avgLatencyMs, tokensIn, tokensOut, costMicros };
  },
};
