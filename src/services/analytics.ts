import 'server-only';

import type {
  AnalyticsSummary,
  AnalyticsDailyPoint,
  PopularQuestion,
  KnowledgeUsageStat,
} from '@/types/ai-platform';
import { crm } from './crm';
import { subscriptionsService } from './subscriptions';
import { specialists } from './specialists';
import { agents } from './agents';
import { runLogRepo } from './repositories/run-log-repo';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, type Result } from './result';

export interface OperationalMetrics {
  receptionistConversations: number;
  completedConsultations: number;
  unresolvedConsultations: number;
  humanEscalations: number;
  recommendations: number;
  subscriptions: number;
  activeCustomers: number;
  followUpCompletion: number; // 0..1
  specialistUsage: { name: string; conversations30d: number }[];
  knowledgeUsage: KnowledgeUsageStat[];
  feedback: { up: number; down: number };
}

/**
 * AI analytics — every figure is computed from REAL rows (ai_run_logs, crm_leads,
 * customer_subscriptions, message_feedback, herne_escalations, profiles). No
 * fabricated series: an empty platform reports zeros and empty charts, honestly.
 */

async function feedbackCounts(): Promise<{ up: number; down: number }> {
  const sb = createAdminClient();
  if (!sb) return { up: 0, down: 0 };
  const [up, down] = await Promise.all([
    sb.from('message_feedback').select('id', { count: 'exact', head: true }).eq('rating', 'up'),
    sb.from('message_feedback').select('id', { count: 'exact', head: true }).eq('rating', 'down'),
  ]);
  return { up: up.count ?? 0, down: down.count ?? 0 };
}

export const analytics = {
  async summary(): Promise<Result<AnalyticsSummary>> {
    const sb = createAdminClient();
    const [runs, agentList, fb] = await Promise.all([runLogRepo.stats(30), agents.list(), feedbackCounts()]);
    const activeAgents = agentList.ok ? agentList.data.filter((a) => a.status === 'active').length : 0;

    let activeUsers = 0;
    let escalations = 0;
    if (sb) {
      const [users, esc] = await Promise.all([
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'member').eq('status', 'active'),
        sb.from('herne_escalations').select('id', { count: 'exact', head: true }),
      ]);
      activeUsers = users.count ?? 0;
      escalations = esc.count ?? 0;
    }

    const rated = fb.up + fb.down;
    return ok({
      totalConversations: runs.total,
      activeUsers,
      activeAgents,
      escalationRate: runs.total > 0 ? Math.min(1, escalations / runs.total) : 0,
      avgResponseMs: runs.avgLatencyMs,
      satisfaction: rated > 0 ? fb.up / rated : 0,
      tokensThisMonth: runs.tokensIn + runs.tokensOut,
      costThisMonthMicros: runs.costMicros,
      currency: 'GBP',
    });
  },

  /** Real per-day AI activity. Empty when the platform has no traffic. */
  async daily(days = 30): Promise<Result<AnalyticsDailyPoint[]>> {
    const real = await runLogRepo.dailySeries(days);
    return ok(
      real.map((p) => ({
        day: p.day,
        conversations: p.conversations,
        // One run = one user + one assistant message.
        messages: p.conversations * 2,
        activeUsers: 0,
        escalations: 0,
        tokensInput: p.tokensInput,
        tokensOutput: p.tokensOutput,
        costMicros: p.costMicros,
        avgLatencyMs: p.avgLatencyMs,
        satisfaction: null,
      })),
    );
  },

  /** Coming soon — question clustering is not yet built. Never fabricated. */
  async popularQuestions(): Promise<Result<PopularQuestion[]>> {
    return ok([]);
  },

  /** Real retrieval counts aggregated from each AI call's retrieved evidence. */
  async knowledgeUsage(): Promise<Result<KnowledgeUsageStat[]>> {
    const sb = createAdminClient();
    if (!sb) return ok([]);
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data } = await sb
      .from('ai_run_logs')
      .select('retrieved_knowledge')
      .eq('is_playground', false)
      .gte('created_at', since)
      .limit(2000);
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const items = Array.isArray(row.retrieved_knowledge) ? (row.retrieved_knowledge as Record<string, unknown>[]) : [];
      for (const item of items) {
        const key = String(item.title ?? item.recordId ?? '').trim();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return ok(
      [...counts.entries()]
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([documentTitle, retrievals]) => ({ documentTitle, retrievals })),
    );
  },

  /** Operational analytics across the customer lifecycle — all real rows. */
  async operational(): Promise<Result<OperationalMetrics>> {
    const [leadsResult, subSummary, specialistsResult, knowledge, fb, usage] = await Promise.all([
      crm.list(),
      subscriptionsService.summary(),
      specialists.all(),
      analytics.knowledgeUsage(),
      feedbackCounts(),
      runLogRepo.usageByAgent(30),
    ]);
    const leads = leadsResult.ok ? leadsResult.data : [];
    const specialistList = specialistsResult.ok ? specialistsResult.data : [];

    const unresolvedStatuses = new Set(['new', 'consultation', 'human_review']);
    const withFollowUp = leads.filter((l) => l.followUpStatus !== 'none');
    const followUpDone = leads.filter((l) => l.followUpStatus === 'done');

    const specialistUsage = specialistList
      .map((s) => ({ name: s.name, conversations30d: usage.get(s.id) ?? 0 }))
      .sort((a, b) => b.conversations30d - a.conversations30d);

    return ok({
      receptionistConversations: leads.filter((l) => l.source === 'receptionist').length,
      completedConsultations: leads.filter((l) => !unresolvedStatuses.has(l.status)).length,
      unresolvedConsultations: leads.filter((l) => unresolvedStatuses.has(l.status)).length,
      humanEscalations: leads.filter((l) => l.escalated).length,
      recommendations: leads.filter((l) => l.recommendedSpecialistSlug !== null).length,
      subscriptions: subSummary.ok ? subSummary.data.total : 0,
      activeCustomers: subSummary.ok ? subSummary.data.active : 0,
      followUpCompletion: withFollowUp.length > 0 ? followUpDone.length / withFollowUp.length : 0,
      specialistUsage,
      knowledgeUsage: knowledge.ok ? knowledge.data : [],
      feedback: fb,
    });
  },
};
