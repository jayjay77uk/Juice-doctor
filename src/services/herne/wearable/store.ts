import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from '../records';
import { escalationEngine } from '../referrals';
import { carePlan } from '../care-plan';
import { loadWearableCatalog, EXPECTED_METRIC_COUNT, wearableMetric } from './catalog';
import { canSpecialistAccessMetric, permittedMetricsFor } from './access';

/**
 * DB-backed wearable service: catalogue ingestion (system configuration),
 * consent ledger, the AI context builder (permitted + minimised + logged) and
 * wearable-triggered escalation. There is NO synchronisation path yet — no
 * device provider is connected, so no measurements are written; reads return
 * honest empty states until a real integration (e.g. Thryve) is wired.
 */

const ORG = HERNE_ORG;

export async function ingestWearableCatalog(): Promise<{ count: number; expectedMet: boolean; persisted: boolean }> {
  const sb = createAdminClient();
  if (!sb) return { count: 0, expectedMet: false, persisted: false };
  const rows = loadWearableCatalog().map((m) => ({
    organisation_id: ORG,
    metric_id: m.metricId,
    name: m.name,
    category: m.category,
    unit: m.unit,
    specialist_access: m.specialistAccess,
    interpretation_guidance: m.interpretationGuidance,
    limitations: m.limitations,
    prohibited_claims: m.prohibitedClaims,
    trend_suitable: m.trendSuitable,
    baseline_required: m.baselineRequired,
    sensitivity: m.sensitivity,
    status: m.status,
    version: m.version,
    updated_at: new Date().toISOString(),
  }));
  await sb.from('wearable_metric_catalog').upsert(rows, { onConflict: 'organisation_id,metric_id' });
  const { count } = await sb.from('wearable_metric_catalog').select('id', { count: 'exact', head: true }).eq('organisation_id', ORG);
  return { count: count ?? 0, expectedMet: (count ?? 0) === EXPECTED_METRIC_COUNT, persisted: true };
}

const DEFAULT_CATEGORIES = ['sleep', 'activity', 'cardiovascular', 'body'];

export const wearableConsent = {
  async grant(userId: string, providerKey = 'thryve', categories: string[] = DEFAULT_CATEGORIES): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    const existing = await sb.from('wearable_consents').select('id, version').eq('user_id', userId).eq('provider_key', providerKey).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const version = existing.data ? Number(existing.data.version) + 1 : 1;
    await sb.from('wearable_consents').insert({
      organisation_id: ORG,
      user_id: userId,
      provider_key: providerKey,
      categories,
      purpose: 'Wellbeing coaching and trend context',
      status: 'granted',
      version,
      granted_at: new Date().toISOString(),
    });
  },
  async revoke(userId: string, providerKey = 'thryve'): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    await sb.from('wearable_consents').insert({
      organisation_id: ORG,
      user_id: userId,
      provider_key: providerKey,
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    });
  },
  async isGranted(userId: string, providerKey = 'thryve'): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { data } = await sb.from('wearable_consents').select('status').eq('user_id', userId).eq('provider_key', providerKey).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data?.status === 'granted';
  },
};

export interface WearableContextItem {
  metricId: string;
  name: string;
  average: number;
  baseline: number;
  deviation: number;
  direction: string;
  confidence: number;
  limitations: string;
}

export interface WearableContext {
  consent: boolean;
  metrics: WearableContextItem[];
  limitations: string;
}

/** AI context builder: only permitted, good-quality, consented trends — never raw history. Logged. */
export async function buildWearableContext(specialistId: string, userId: string): Promise<WearableContext> {
  const sb = createAdminClient();
  if (!sb) return { consent: false, metrics: [], limitations: 'Wearable data unavailable.' };
  const consent = await wearableConsent.isGranted(userId);
  const permitted = permittedMetricsFor(specialistId);
  const catalog = loadWearableCatalog();

  const { data: trends } = await sb.from('wearable_trend_summaries').select('*').eq('user_id', userId).eq('window', 'weekly').in('metric_id', permitted.length ? permitted : ['__none__']);

  const metrics: WearableContextItem[] = [];
  for (const t of (trends ?? []) as Record<string, unknown>[]) {
    const metricId = String(t.metric_id);
    // low-confidence trends are excluded from AI context (quality gate)
    const quality: 'good' | 'poor' = Number(t.confidence) < 0.5 ? 'poor' : 'good';
    const decision = canSpecialistAccessMetric({ specialistId, metricId, consentGranted: consent, quality });
    if (!decision.allowed) continue;
    metrics.push({
      metricId,
      name: wearableMetric(metricId)?.name ?? metricId,
      average: Number(t.average),
      baseline: Number(t.baseline),
      deviation: Number(t.deviation),
      direction: String(t.direction),
      confidence: Number(t.confidence),
      limitations: catalog.find((m) => m.metricId === metricId)?.limitations ?? '',
    });
  }

  // Log the AI access + context preparation.
  await sb.from('wearable_access_logs').insert({ organisation_id: ORG, user_id: userId, specialist: specialistId, metric_ids: metrics.map((m) => m.metricId), purpose: 'ai_context', granted: consent, reason: consent ? 'permitted' : 'no_consent' });
  await sb.from('wearable_ai_context_logs').insert({ organisation_id: ORG, user_id: userId, specialist: specialistId, context: metrics as unknown as Record<string, unknown>, metric_count: metrics.length });

  return {
    consent,
    metrics,
    limitations: 'Consumer wearable data is not diagnostic; trends are preferred over single readings and shown only with consent and within specialist scope.',
  };
}

export interface WearableDashboard {
  consent: boolean;
  categories: string[];
  lastSyncAt: string | null;
  trends: { metricId: string; name: string; average: number; direction: string; deviation: number; confidence: number; unit: string; missingNotice: string | null }[];
  qualityFlags: number;
}

/** Read-model for the user's Connected Health dashboard — reads the live wearable tables; empty until a device integration is connected. */
export async function wearableDashboard(userId: string): Promise<WearableDashboard> {
  const sb = createAdminClient();
  if (!sb) return { consent: false, categories: [], lastSyncAt: null, trends: [], qualityFlags: 0 };
  const consent = await wearableConsent.isGranted(userId);
  const consentRow = await sb.from('wearable_consents').select('categories, status').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const job = await sb.from('wearable_sync_jobs').select('finished_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const { data: trends } = await sb.from('wearable_trend_summaries').select('*').eq('user_id', userId).eq('window', 'weekly');
  const { count } = await sb.from('wearable_data_quality_flags').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  return {
    consent,
    categories: (consentRow.data?.categories as string[] | null) ?? [],
    lastSyncAt: (job.data?.finished_at as string | null) ?? null,
    trends: ((trends ?? []) as Record<string, unknown>[]).map((t) => ({
      metricId: String(t.metric_id),
      name: wearableMetric(String(t.metric_id))?.name ?? String(t.metric_id),
      average: Number(t.average),
      direction: String(t.direction),
      deviation: Number(t.deviation),
      confidence: Number(t.confidence),
      unit: wearableMetric(String(t.metric_id))?.unit ?? '',
      missingNotice: (t.missing_notice as string | null) ?? null,
    })),
    qualityFlags: count ?? 0,
  };
}

/** Wearable-triggered review: concerning trend on a permitted metric → human review via the existing engine. */
export async function evaluateWearableEscalations(userId: string, specialist = 'optimus'): Promise<{ escalated: number }> {
  const sb = createAdminClient();
  if (!sb) return { escalated: 0 };
  const { data: trends } = await sb.from('wearable_trend_summaries').select('*').eq('user_id', userId).eq('window', 'weekly');
  let escalated = 0;
  for (const t of (trends ?? []) as Record<string, unknown>[]) {
    const metricId = String(t.metric_id);
    const deviation = Number(t.deviation);
    // Conservative thresholds — a marked sustained rise in resting HR, or low oxygen.
    const concerning = (metricId === 'resting_heart_rate' && deviation > 12) || (metricId === 'oxygen_saturation' && Number(t.average) < 92);
    if (concerning && Number(t.confidence) >= 0.5) {
      await escalationEngine.escalate({
        userId,
        trigger: 'clinical_review',
        reason: `Wearable trend: ${metricId} deviation ${deviation} from baseline — not diagnostic, human review recommended.`,
        specialist,
        destination: 'Human clinical review',
        urgency: 'Prompt',
      });
      await sb.from('wearable_escalations').insert({ organisation_id: ORG, user_id: userId, metric_id: metricId, trigger: 'concerning_trend', reason: `deviation ${deviation}`, specialist, destination: 'Human clinical review', urgency: 'Prompt' });
      const plan = await carePlan.get(userId);
      if (plan) await carePlan.addAction(plan.id, { specialist, kind: 'review', title: `Review ${metricId} trend with a clinician`, evidenceRefs: [] });
      escalated += 1;
    }
  }
  return { escalated };
}
