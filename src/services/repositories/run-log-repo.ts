import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { track } from '@/lib/monitoring/events';

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
    // Operational event only — status + model, never prompt/response content.
    // 'blocked' is the safety system working, not a failure.
    const status = input.status ?? 'ok';
    if (status !== 'ok' && status !== 'blocked') {
      await track('ai.failure', { status, model: input.model ?? 'unknown' }, input.actorId ?? null);
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

  /** Real conversations per agent over the window (non-playground). */
  async usageByAgent(sinceDays = 30): Promise<Map<string, number>> {
    const sb = createAdminClient();
    const map = new Map<string, number>();
    if (!sb) return map;
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    const { data } = await sb
      .from('ai_run_logs')
      .select('agent_id')
      .eq('organisation_id', ORG)
      .eq('is_playground', false)
      .gte('created_at', since);
    for (const r of data ?? []) {
      const key = r.agent_id ? String(r.agent_id) : '';
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  },

  /** Real per-day aggregates for the analytics chart (non-playground). */
  async dailySeries(sinceDays = 30): Promise<{ day: string; conversations: number; tokensInput: number; tokensOutput: number; costMicros: number; avgLatencyMs: number }[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    const { data } = await sb
      .from('ai_run_logs')
      .select('created_at, tokens_input, tokens_output, cost_micros, latency_ms')
      .eq('organisation_id', ORG)
      .eq('is_playground', false)
      .gte('created_at', since);
    const byDay = new Map<string, { conversations: number; tokensInput: number; tokensOutput: number; costMicros: number; latencySum: number; latencyCount: number }>();
    for (const r of data ?? []) {
      const day = String(r.created_at).slice(0, 10);
      const b = byDay.get(day) ?? { conversations: 0, tokensInput: 0, tokensOutput: 0, costMicros: 0, latencySum: 0, latencyCount: 0 };
      b.conversations += 1;
      b.tokensInput += Number(r.tokens_input) || 0;
      b.tokensOutput += Number(r.tokens_output) || 0;
      b.costMicros += Number(r.cost_micros) || 0;
      const lat = Number(r.latency_ms) || 0;
      if (lat > 0) {
        b.latencySum += lat;
        b.latencyCount += 1;
      }
      byDay.set(day, b);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, b]) => ({
        day,
        conversations: b.conversations,
        tokensInput: b.tokensInput,
        tokensOutput: b.tokensOutput,
        costMicros: b.costMicros,
        avgLatencyMs: b.latencyCount ? Math.round(b.latencySum / b.latencyCount) : 0,
      }));
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

  /** Inference reliability over a window: real counts per run status. */
  async statusBreakdown(sinceDays = 30): Promise<{ status: string; count: number }[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    const { data } = await sb.from('ai_run_logs').select('status').eq('organisation_id', ORG).gte('created_at', since).limit(5000);
    const counts = new Map<string, number>();
    for (const r of data ?? []) {
      const s = String(r.status ?? 'unknown');
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
  },

  /** Most recent non-ok runs (metadata only — never prompt/response content). */
  async recentFailures(limit = 10): Promise<{ id: string; agentId: string | null; status: string; latencyMs: number | null; traceId: string | null; createdAt: string }[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb
      .from('ai_run_logs')
      .select('id, agent_id, status, latency_ms, trace_id, created_at')
      .eq('organisation_id', ORG)
      .neq('status', 'ok')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      id: String(r.id),
      agentId: (r.agent_id as string | null) ?? null,
      status: String(r.status),
      latencyMs: r.latency_ms != null ? Number(r.latency_ms) : null,
      traceId: (r.trace_id as string | null) ?? null,
      createdAt: String(r.created_at),
    }));
  },
};
