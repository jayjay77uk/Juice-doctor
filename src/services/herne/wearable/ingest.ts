import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from '../records';
import { normaliseMeasurement, isDuplicate, type RawMeasurement } from './normalise';
import { computeTrend, mean } from './trends';
import { wearableConsent } from './store';

/**
 * The REAL measurement ingest engine — provider-agnostic and idempotent. It
 * only ever runs on measurements delivered by a live, credentialed provider
 * (webhook or sync pull); nothing generates data. Pipeline per batch:
 * validate + normalise → drop duplicates already stored (idempotency) →
 * insert measurements + quality flags → recompute weekly trends → record the
 * sync job. Consent is checked before anything is stored.
 */

const ORG = HERNE_ORG;

export interface IngestResult {
  stored: number;
  duplicates: number;
  rejected: number;
  qualityFlags: number;
  trends: number;
  consent: boolean;
}

export async function ingestMeasurements(userId: string, raw: RawMeasurement[], sourceLabel: string): Promise<IngestResult> {
  const sb = createAdminClient();
  if (!sb) return { stored: 0, duplicates: 0, rejected: 0, qualityFlags: 0, trends: 0, consent: false };

  // No consent, no storage — the provider may still push; we refuse the data.
  const consentGranted = await wearableConsent.isGranted(userId);
  if (!consentGranted) {
    await sb.from('wearable_sync_jobs').insert({
      organisation_id: ORG,
      user_id: userId,
      status: 'refused_no_consent',
      metrics_synced: 0,
      finished_at: new Date().toISOString(),
    });
    return { stored: 0, duplicates: 0, rejected: 0, qualityFlags: 0, trends: 0, consent: false };
  }

  // Idempotency: dedupe against what is ALREADY stored for this user, so a
  // replayed webhook or overlapping sync never double-counts a reading.
  const { data: existing } = await sb.from('wearable_measurements').select('metric_id, observed_at').eq('user_id', userId);
  const seen = new Set(
    (existing ?? []).map((r: Record<string, unknown>) => `${r.metric_id}|${r.observed_at ? new Date(String(r.observed_at)).toISOString() : ''}`),
  );

  const byMetric = new Map<string, RawMeasurement[]>();
  let rejected = 0;
  for (const r of raw) {
    if (!r || typeof r.metricId !== 'string' || !Number.isFinite(r.value) || !r.observedAt || Number.isNaN(new Date(r.observedAt).getTime())) {
      rejected += 1;
      continue;
    }
    byMetric.set(r.metricId, [...(byMetric.get(r.metricId) ?? []), r]);
  }

  const measurementRows: Record<string, unknown>[] = [];
  const qualityRows: Record<string, unknown>[] = [];
  const trendRows: Record<string, unknown>[] = [];
  let duplicates = 0;

  for (const [metricId, list] of byMetric) {
    const baseline = mean(list.map((r) => r.value));
    for (const r of list) {
      if (isDuplicate(r, seen)) {
        duplicates += 1;
        continue;
      }
      seen.add(`${r.metricId}|${r.observedAt ? new Date(r.observedAt).toISOString() : ''}`);
      const n = normaliseMeasurement(r, { baseline, consentStatus: 'granted' });
      measurementRows.push({
        organisation_id: ORG,
        user_id: userId,
        metric_id: n.metricId,
        canonical_name: n.canonicalName,
        value: n.value,
        unit: n.unit,
        source_provider: n.sourceProvider || sourceLabel,
        source_device: n.sourceDevice,
        observed_at: n.observedAt,
        timezone: n.timezone,
        personal_baseline: n.personalBaseline,
        deviation: n.deviation,
        data_quality: n.dataQuality,
        confidence: n.confidence,
        raw_source_ref: n.rawSourceRef,
        consent_status: n.consentStatus,
        sensitivity: n.sensitivity,
      });
      for (const issue of n.issues) {
        qualityRows.push({ organisation_id: ORG, user_id: userId, metric_id: metricId, issue: issue.code, detail: issue.detail, severity: issue.severity });
      }
    }
  }

  if (measurementRows.length) {
    const { error } = await sb.from('wearable_measurements').insert(measurementRows);
    if (error) {
      await sb.from('wearable_sync_jobs').insert({ organisation_id: ORG, user_id: userId, status: 'failed', metrics_synced: 0, finished_at: new Date().toISOString() });
      return { stored: 0, duplicates, rejected, qualityFlags: 0, trends: 0, consent: true };
    }
  }
  if (qualityRows.length) await sb.from('wearable_data_quality_flags').insert(qualityRows);

  // Recompute weekly trends from ALL stored measurements per affected metric
  // (not just this batch), so trends stay correct across partial deliveries.
  for (const metricId of byMetric.keys()) {
    const { data: all } = await sb
      .from('wearable_measurements')
      .select('value, observed_at')
      .eq('user_id', userId)
      .eq('metric_id', metricId)
      .order('observed_at', { ascending: true })
      .limit(500);
    const series = ((all ?? []) as Record<string, unknown>[]).map((m) => ({ value: Number(m.value), observedAt: String(m.observed_at) }));
    if (!series.length) continue;
    const trend = computeTrend(series, { window: 'weekly' });
    trendRows.push({
      organisation_id: ORG,
      user_id: userId,
      metric_id: metricId,
      window: 'weekly',
      average: trend.average,
      baseline: trend.baseline,
      deviation: trend.deviation,
      direction: trend.direction,
      confidence: trend.confidence,
      coverage: trend.coverage,
      missing_notice: trend.missingNotice,
    });
  }
  if (trendRows.length) {
    await sb.from('wearable_trend_summaries').delete().eq('user_id', userId).eq('window', 'weekly').in('metric_id', [...byMetric.keys()]);
    await sb.from('wearable_trend_summaries').insert(trendRows);
  }

  await sb.from('wearable_sync_jobs').insert({
    organisation_id: ORG,
    user_id: userId,
    status: 'ok',
    metrics_synced: byMetric.size,
    finished_at: new Date().toISOString(),
  });

  return { stored: measurementRows.length, duplicates, rejected, qualityFlags: qualityRows.length, trends: trendRows.length, consent: true };
}
