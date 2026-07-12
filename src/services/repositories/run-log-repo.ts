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
      });
    } catch {
      // best-effort — never surface a logging failure to the caller
    }
  },

  /** Aggregate stats for analytics (last N days). */
  async stats(sinceDays = 30): Promise<{ total: number; errors: number; avgLatencyMs: number; tokensIn: number; tokensOut: number }> {
    const sb = createAdminClient();
    if (!sb) return { total: 0, errors: 0, avgLatencyMs: 0, tokensIn: 0, tokensOut: 0 };
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    const { data } = await sb
      .from('ai_run_logs')
      .select('status, latency_ms, tokens_input, tokens_output')
      .gte('created_at', since);
    const rows = data ?? [];
    const total = rows.length;
    const errors = rows.filter((r) => r.status !== 'ok').length;
    const latencies = rows.map((r) => Number(r.latency_ms) || 0).filter((n) => n > 0);
    const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const tokensIn = rows.reduce((a, r) => a + (Number(r.tokens_input) || 0), 0);
    const tokensOut = rows.reduce((a, r) => a + (Number(r.tokens_output) || 0), 0);
    return { total, errors, avgLatencyMs, tokensIn, tokensOut };
  },
};
