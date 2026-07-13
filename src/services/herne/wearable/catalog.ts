import wearableJson from '@/data/herne/wearable-catalog.json';
import { HERNE_SPECIALIST_IDS } from '../records';

/**
 * Pure loader for the client wearable metric catalogue (authoritative). The five
 * supplied fields (metric, unit, specialist access, permitted use, limitations)
 * are preserved verbatim; category, sensitivity and trend/baseline suitability are
 * DERIVED defaults, clearly flagged, and the prohibited-claim rule is the platform
 * rule "consumer wearable data must not be presented as diagnostic". No new
 * per-metric permissions are invented.
 */

interface CatalogRow {
  metric: string;
  unit_or_format: string;
  specialist_access: string;
  permitted_use: string;
  limitations: string;
}

export interface WearableMetric {
  metricId: string;
  name: string;
  category: string;
  unit: string;
  /** Specialist ids permitted by the client catalogue. */
  specialistAccess: string[];
  interpretationGuidance: string;
  limitations: string;
  prohibitedClaims: string;
  trendSuitable: boolean;
  baselineRequired: boolean;
  sensitivity: 'standard' | 'elevated' | 'high';
  /** 'client_supplied' for the authoritative fields; derived fields are flagged in derivedFields. */
  status: string;
  version: string;
  derivedFields: string[];
}

export const EXPECTED_METRIC_COUNT = 15;
const PROHIBITED_CLAIM = 'Consumer wearable data must not be presented as diagnostic.';

const CATEGORY: Record<string, string> = {
  resting_heart_rate: 'cardiovascular',
  heart_rate_variability: 'cardiovascular',
  respiratory_rate: 'respiratory',
  oxygen_saturation: 'respiratory',
  sleep_duration: 'sleep',
  sleep_regularity: 'sleep',
  steps: 'activity',
  active_minutes: 'activity',
  training_load: 'activity',
  skin_temperature_deviation: 'temperature',
  body_mass: 'body',
  hydration_log: 'log',
  menstrual_cycle_log: 'log',
  nutrition_log: 'log',
  bowel_log: 'log',
};

const HIGH_SENSITIVITY = new Set(['menstrual_cycle_log', 'bowel_log', 'nutrition_log']);
const ELEVATED_SENSITIVITY = new Set(['hydration_log', 'body_mass', 'skin_temperature_deviation']);

function humanName(metric: string): string {
  return metric.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse "Optimus; Atlas; Serena" or "All except Felix" into specialist ids. */
export function parseSpecialistAccess(raw: string): string[] {
  const t = raw.trim();
  if (/^all/i.test(t)) {
    const exceptMatch = t.match(/except\s+(.+)$/i);
    const excluded = exceptMatch?.[1]?.split(/[;,]/).map((s) => s.trim().toLowerCase()) ?? [];
    return HERNE_SPECIALIST_IDS.filter((s) => !excluded.includes(s));
  }
  return t
    .split(';')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => (HERNE_SPECIALIST_IDS as readonly string[]).includes(s));
}

function toMetric(row: CatalogRow): WearableMetric {
  return {
    metricId: row.metric,
    name: humanName(row.metric),
    category: CATEGORY[row.metric] ?? 'other',
    unit: row.unit_or_format,
    specialistAccess: parseSpecialistAccess(row.specialist_access),
    interpretationGuidance: row.permitted_use,
    limitations: row.limitations,
    prohibitedClaims: PROHIBITED_CLAIM,
    trendSuitable: true,
    baselineRequired: true,
    sensitivity: HIGH_SENSITIVITY.has(row.metric) ? 'high' : ELEVATED_SENSITIVITY.has(row.metric) ? 'elevated' : 'standard',
    status: 'client_supplied',
    version: '1.0',
    derivedFields: ['category', 'sensitivity', 'trendSuitable', 'baselineRequired', 'prohibitedClaims'],
  };
}

export function loadWearableCatalog(): WearableMetric[] {
  return (wearableJson as CatalogRow[]).map(toMetric);
}

export function wearableMetric(metricId: string): WearableMetric | undefined {
  return loadWearableCatalog().find((m) => m.metricId === metricId);
}
