import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { SpecialistSubscription, SpecialistAnalytics } from '@/types/crm';
import { agents } from './agents';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, type Result } from './result';

/**
 * Specialist AI service — treats specialist agents as SUBSCRIPTION PRODUCTS.
 * Config comes from ai_agents; the commercial layer reads REAL rows: subscribers
 * from customer_subscriptions, conversations + latency from ai_run_logs. No mock
 * data — a specialist with no subscribers or traffic reports zeros, honestly.
 * (No pricing is configured, so MRR is 0 until the client sets prices.)
 */

async function specialistList(): Promise<AiAgent[]> {
  const result = await agents.list();
  return (result.ok ? result.data : []).filter((a) => a.kind === 'specialist');
}

/** Real customer subscriptions covering this specialist's slug. */
async function realSubscriptions(slug: string): Promise<SpecialistSubscription[]> {
  const sb = createAdminClient();
  if (!sb) return [];
  const { data } = await sb
    .from('customer_subscriptions')
    .select('id, customer_name, customer_email, scope, specialist_slugs, state, started_at, plan_name')
    .contains('specialist_slugs', [slug]);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    specialistSlug: slug,
    scope: (r.scope as SpecialistSubscription['scope']) ?? 'single',
    customerName: String(r.customer_name),
    customerEmail: String(r.customer_email),
    state: (r.state as SpecialistSubscription['state']) ?? 'active',
    mrr: 0, // no pricing configured — never invented
    startedAt: String(r.started_at ?? ''),
    plan: String(r.plan_name ?? 'Plan'),
  }));
}

/** Real 30-day run-log stats for one agent. */
async function agentRunStats(agentId: string): Promise<{ conversations30d: number; avgResponseMs: number }> {
  const sb = createAdminClient();
  if (!sb) return { conversations30d: 0, avgResponseMs: 0 };
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await sb
    .from('ai_run_logs')
    .select('latency_ms')
    .eq('agent_id', agentId)
    .eq('is_playground', false)
    .gte('created_at', since);
  const rows = data ?? [];
  const latencies = rows.map((r) => Number(r.latency_ms) || 0).filter((n) => n > 0);
  return {
    conversations30d: rows.length,
    avgResponseMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
  };
}

export const specialists = {
  /** Public catalogue — active, public specialist products. */
  async catalogue(): Promise<Result<AiAgent[]>> {
    const list = await specialistList();
    return ok(list.filter((a) => a.status === 'active' && a.visibility === 'public'));
  },
  /** All specialists (incl. drafts) — for admin. */
  async all(): Promise<Result<AiAgent[]>> {
    return ok(await specialistList());
  },
  async bySlug(slug: string): Promise<Result<AiAgent>> {
    const match = (await specialistList()).find((a) => a.slug === slug);
    return match ? ok(match) : err({ code: 'not_found', message: 'Specialist not found.' });
  },
  async byId(id: string): Promise<Result<AiAgent>> {
    const match = (await specialistList()).find((a) => a.id === id);
    return match ? ok(match) : err({ code: 'not_found', message: 'Specialist not found.' });
  },
  async subscriptions(slug: string): Promise<Result<SpecialistSubscription[]>> {
    const match = (await specialistList()).find((a) => a.slug === slug);
    if (!match) return err({ code: 'not_found', message: 'Specialist not found.' });
    return ok(await realSubscriptions(slug));
  },
  async analytics(slug: string): Promise<Result<SpecialistAnalytics>> {
    const match = (await specialistList()).find((a) => a.slug === slug);
    if (!match) return err({ code: 'not_found', message: 'Specialist not found.' });
    const [subs, runs] = await Promise.all([realSubscriptions(slug), agentRunStats(match.id)]);
    const active = subs.filter((s) => s.state === 'active' || s.state === 'trialing').length;
    const canceled = subs.filter((s) => s.state === 'canceled').length;
    return ok({
      subscribers: subs.length,
      activeSubscribers: active,
      mrr: 0, // no pricing configured
      conversations30d: runs.conversations30d,
      satisfaction: 0, // per-specialist satisfaction reported once members rate replies
      churnRate: subs.length ? canceled / subs.length : 0,
      avgResponseMs: runs.avgResponseMs,
    });
  },
};
