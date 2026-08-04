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
 * AI analytics foundation. Prototype returns deterministic mock figures so the
 * dashboards are fully populated; production reads analytics_events /
 * analytics_daily_rollup (migration 0014). All values are illustrative.
 */

const BASE_DAY = '2026-07-10';

/** Deterministic pseudo-random in [0,1) from an integer seed (no Math.random). */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function isoDayMinus(base: string, daysAgo: number): string {
  const d = new Date(`${base}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function buildDailySeries(days: number): AnalyticsDailyPoint[] {
  const points: AnalyticsDailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const r = seeded(i + 1);
    const conversations = 40 + Math.round(r * 60) + (days - i);
    const messages = conversations * (5 + Math.round(seeded(i + 7) * 4));
    points.push({
      day: isoDayMinus(BASE_DAY, i),
      conversations,
      messages,
      activeUsers: 25 + Math.round(seeded(i + 3) * 40),
      escalations: Math.round(conversations * (0.03 + seeded(i + 11) * 0.04)),
      tokensInput: messages * 180,
      tokensOutput: messages * 320,
      costMicros: messages * 900,
      avgLatencyMs: 700 + Math.round(seeded(i + 5) * 900),
      satisfaction: 0.82 + seeded(i + 13) * 0.14,
    });
  }
  return points;
}

const DAILY_30 = buildDailySeries(30);

export const analytics = {
  async summary(): Promise<Result<AnalyticsSummary>> {
    const totalConversations = DAILY_30.reduce((s, p) => s + p.conversations, 0);
    const escalations = DAILY_30.reduce((s, p) => s + p.escalations, 0);
    const tokens = DAILY_30.reduce((s, p) => s + p.tokensInput + p.tokensOutput, 0);
    const cost = DAILY_30.reduce((s, p) => s + p.costMicros, 0);
    const avgLatency = Math.round(DAILY_30.reduce((s, p) => s + p.avgLatencyMs, 0) / DAILY_30.length);
    const satisfaction =
      DAILY_30.reduce((s, p) => s + (p.satisfaction ?? 0), 0) / DAILY_30.length;

    // Real AI-usage metrics from the run log; illustrative baselines until enough
    // real traffic exists (so an empty platform still renders a sensible page).
    const [runs, agentList] = await Promise.all([runLogRepo.stats(30), agents.list()]);
    const activeAgents = agentList.ok ? agentList.data.filter((a) => a.status === 'active').length : 3;
    const realTokens = runs.tokensIn + runs.tokensOut;

    return ok({
      totalConversations: runs.total > 0 ? runs.total : totalConversations,
      activeUsers: 342,
      activeAgents,
      escalationRate: escalations / totalConversations,
      avgResponseMs: runs.avgLatencyMs > 0 ? runs.avgLatencyMs : avgLatency,
      satisfaction,
      tokensThisMonth: realTokens > 0 ? realTokens : tokens,
      // Real estimated spend from ai_run_logs.cost_micros when live traffic exists.
      costThisMonthMicros: runs.costMicros > 0 ? runs.costMicros : cost,
      currency: 'GBP',
    });
  },

  async daily(days = 30): Promise<Result<AnalyticsDailyPoint[]>> {
    // Real per-day AI activity when live traffic exists; the deterministic
    // series remains only so an empty platform still renders a sensible chart.
    const real = await runLogRepo.dailySeries(days);
    if (real.length > 0) {
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
    }
    return ok(DAILY_30.slice(-Math.min(days, DAILY_30.length)));
  },

  async popularQuestions(): Promise<Result<PopularQuestion[]>> {
    return ok([
      { question: 'How do I get started?', count: 214 },
      { question: 'What features are included?', count: 187 },
      { question: 'How do I update my account settings?', count: 156 },
      { question: 'How does billing work?', count: 143 },
      { question: 'How do I contact support?', count: 121 },
    ]);
  },

  async knowledgeUsage(): Promise<Result<KnowledgeUsageStat[]>> {
    return ok([
      { documentTitle: 'Getting Started Guide', retrievals: 892 },
      { documentTitle: 'Overview', retrievals: 641 },
      { documentTitle: 'Reference Notes', retrievals: 508 },
      { documentTitle: 'Intake Questionnaire Reference', retrievals: 377 },
    ]);
  },

  /** Operational analytics for the whole customer lifecycle (Phase 3.E). */
  async operational(): Promise<Result<OperationalMetrics>> {
    const [leadsResult, subSummary, specialistsResult, knowledge] = await Promise.all([
      crm.list(),
      subscriptionsService.summary(),
      specialists.all(),
      analytics.knowledgeUsage(),
    ]);
    const leads = leadsResult.ok ? leadsResult.data : [];
    const specialistList = specialistsResult.ok ? specialistsResult.data : [];

    const unresolvedStatuses = new Set(['new', 'consultation', 'human_review']);
    const withFollowUp = leads.filter((l) => l.followUpStatus !== 'none');
    const followUpDone = leads.filter((l) => l.followUpStatus === 'done');

    // Real conversations per specialist from the run log (falls back to the
    // illustrative per-specialist figures only when there is no live traffic).
    const usage = await runLogRepo.usageByAgent(30);
    let specialistUsage: { name: string; conversations30d: number }[];
    if (usage.size > 0) {
      specialistUsage = specialistList
        .map((s) => ({ name: s.name, conversations30d: usage.get(s.id) ?? 0 }))
        .sort((a, b) => b.conversations30d - a.conversations30d);
    } else {
      specialistUsage = await Promise.all(
        specialistList.map(async (s) => {
          const a = await specialists.analytics(s.slug);
          return { name: s.name, conversations30d: a.ok ? a.data.conversations30d : 0 };
        }),
      );
    }

    // Real thumbs up/down from message_feedback when the database is present.
    let feedback = { up: 128, down: 12 };
    const sb = createAdminClient();
    if (sb) {
      const [up, down] = await Promise.all([
        sb.from('message_feedback').select('id', { count: 'exact', head: true }).eq('rating', 'up'),
        sb.from('message_feedback').select('id', { count: 'exact', head: true }).eq('rating', 'down'),
      ]);
      feedback = { up: up.count ?? 0, down: down.count ?? 0 };
    }

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
      feedback,
    });
  },
};
