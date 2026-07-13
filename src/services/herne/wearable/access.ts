import { loadWearableCatalog, type WearableMetric } from './catalog';

/**
 * Pure wearable access control. A specialist may see a metric ONLY when the
 * client catalogue permits that specialist AND consent is granted AND scope/quality
 * allow it. Existence of a metric never implies access.
 */

export interface AccessContext {
  specialistId: string;
  metricId: string;
  consentGranted: boolean;
  /** Data-quality label of the reading being considered. */
  quality?: 'good' | 'fair' | 'poor' | 'unknown';
  /** Whether this specialist's current workflow needs this metric (purpose binding). */
  purposeInScope?: boolean;
}

export interface AccessDecision {
  allowed: boolean;
  reasons: string[];
  metric: WearableMetric | null;
}

export function canSpecialistAccessMetric(ctx: AccessContext, catalog: WearableMetric[] = loadWearableCatalog()): AccessDecision {
  const metric = catalog.find((m) => m.metricId === ctx.metricId) ?? null;
  const reasons: string[] = [];
  if (!metric) return { allowed: false, reasons: ['unknown_metric'], metric: null };
  if (!metric.specialistAccess.includes(ctx.specialistId)) reasons.push('specialist_not_permitted');
  if (!ctx.consentGranted) reasons.push('consent_required');
  if (ctx.purposeInScope === false) reasons.push('out_of_scope');
  if (ctx.quality === 'poor') reasons.push('poor_data_quality');
  return { allowed: reasons.length === 0, reasons, metric };
}

/** The metric ids a specialist is permitted to see (catalogue-level, before consent/quality). */
export function permittedMetricsFor(specialistId: string, catalog: WearableMetric[] = loadWearableCatalog()): string[] {
  return catalog.filter((m) => m.specialistAccess.includes(specialistId)).map((m) => m.metricId);
}
