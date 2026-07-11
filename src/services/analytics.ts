import 'server-only';

import type {
  AnalyticsSummary,
  AnalyticsDailyPoint,
  PopularQuestion,
  KnowledgeUsageStat,
} from '@/types/ai-platform';
import { ok, type Result } from './result';

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
    return ok({
      totalConversations,
      activeUsers: 342,
      activeAgents: 3,
      escalationRate: escalations / totalConversations,
      avgResponseMs: avgLatency,
      satisfaction,
      tokensThisMonth: tokens,
      costThisMonthMicros: cost,
      currency: 'GBP',
    });
  },

  async daily(days = 30): Promise<Result<AnalyticsDailyPoint[]>> {
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
      { documentTitle: 'Product Overview', retrievals: 641 },
      { documentTitle: 'Product FAQ', retrievals: 508 },
      { documentTitle: 'Account Management Guide', retrievals: 377 },
    ]);
  },
};
