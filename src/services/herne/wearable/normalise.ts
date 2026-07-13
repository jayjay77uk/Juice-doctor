import { wearableMetric } from './catalog';

/**
 * Pure normalisation + data-quality layer. Vendor readings are normalised to the
 * canonical model; the original source value is preserved in rawSourceRef. Quality
 * issues are recorded and poor-quality data is flagged so it is never used in AI
 * context without a visible limitation.
 */

export interface RawMeasurement {
  userId: string;
  metricId: string;
  value: number;
  unit: string;
  provider: string;
  device?: string;
  observedAt?: string;
  timezone?: string;
  confidence?: number;
  raw?: Record<string, unknown>;
}

export interface QualityIssue {
  code: string;
  detail: string;
  severity: 'low' | 'high';
}

export type DataQuality = 'good' | 'fair' | 'poor' | 'unknown';

export interface NormalisedMeasurement {
  userId: string;
  metricId: string;
  canonicalName: string;
  value: number;
  unit: string;
  sourceProvider: string;
  sourceDevice: string | null;
  observedAt: string | null;
  timezone: string | null;
  receivedAt: string;
  personalBaseline: number | null;
  deviation: number | null;
  dataQuality: DataQuality;
  confidence: number | null;
  rawSourceRef: Record<string, unknown>;
  consentStatus: string;
  sensitivity: string;
  issues: QualityIssue[];
}

/** Plausible ranges per metric — impossible values fall outside. */
const RANGES: Record<string, [number, number]> = {
  resting_heart_rate: [20, 250],
  heart_rate_variability: [1, 400],
  respiratory_rate: [4, 60],
  oxygen_saturation: [50, 100],
  sleep_duration: [0, 1440],
  sleep_regularity: [0, 720],
  steps: [0, 120000],
  active_minutes: [0, 1440],
  training_load: [0, 2000],
  skin_temperature_deviation: [-10, 10],
  body_mass: [20, 400],
};

export function checkQuality(
  raw: RawMeasurement,
  opts?: { expectedUnit?: string; baseline?: number; stddev?: number; now?: number; staleAfterHours?: number },
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const now = opts?.now ?? Date.now();

  if (!raw.observedAt) {
    issues.push({ code: 'missing_timestamp', detail: 'no observed timestamp', severity: 'high' });
  } else {
    const t = new Date(raw.observedAt).getTime();
    if (Number.isNaN(t)) issues.push({ code: 'invalid_timestamp', detail: raw.observedAt, severity: 'high' });
    else {
      const ageHours = (now - t) / 3_600_000;
      if (ageHours > (opts?.staleAfterHours ?? 72)) issues.push({ code: 'stale_data', detail: `${Math.round(ageHours)}h old`, severity: 'low' });
      if (t > now + 3_600_000) issues.push({ code: 'future_timestamp', detail: raw.observedAt, severity: 'high' });
    }
  }

  const range = RANGES[raw.metricId];
  if (range && (raw.value < range[0] || raw.value > range[1])) {
    issues.push({ code: 'impossible_value', detail: `${raw.value} outside [${range[0]}, ${range[1]}]`, severity: 'high' });
  }

  const expected = opts?.expectedUnit ?? wearableMetric(raw.metricId)?.unit;
  if (expected && raw.unit && raw.unit.toLowerCase() !== expected.toLowerCase()) {
    issues.push({ code: 'unit_mismatch', detail: `${raw.unit} != ${expected}`, severity: 'high' });
  }

  if (typeof raw.confidence === 'number' && raw.confidence < 0.4) {
    issues.push({ code: 'low_confidence', detail: `${raw.confidence}`, severity: 'low' });
  }

  if (typeof opts?.baseline === 'number' && typeof opts?.stddev === 'number' && opts.stddev > 0) {
    const z = Math.abs((raw.value - opts.baseline) / opts.stddev);
    if (z > 4) issues.push({ code: 'outlier', detail: `z=${z.toFixed(1)}`, severity: 'low' });
  }

  return issues;
}

function qualityFrom(issues: QualityIssue[]): DataQuality {
  if (issues.some((i) => i.severity === 'high')) return 'poor';
  if (issues.length) return 'fair';
  return 'good';
}

export function normaliseMeasurement(
  raw: RawMeasurement,
  opts?: { baseline?: number; stddev?: number; consentStatus?: string; now?: number },
): NormalisedMeasurement {
  const metric = wearableMetric(raw.metricId);
  const issues = checkQuality(raw, { ...(opts?.baseline !== undefined ? { baseline: opts.baseline } : {}), ...(opts?.stddev !== undefined ? { stddev: opts.stddev } : {}), ...(opts?.now !== undefined ? { now: opts.now } : {}) });
  const baseline = opts?.baseline ?? null;
  return {
    userId: raw.userId,
    metricId: raw.metricId,
    canonicalName: metric?.name ?? raw.metricId,
    value: raw.value,
    unit: metric?.unit ?? raw.unit,
    sourceProvider: raw.provider,
    sourceDevice: raw.device ?? null,
    observedAt: raw.observedAt ?? null,
    timezone: raw.timezone ?? null,
    receivedAt: new Date(opts?.now ?? Date.now()).toISOString(),
    personalBaseline: baseline,
    deviation: baseline != null ? Math.round((raw.value - baseline) * 100) / 100 : null,
    dataQuality: qualityFrom(issues),
    confidence: raw.confidence ?? null,
    rawSourceRef: raw.raw ?? { value: raw.value, unit: raw.unit, provider: raw.provider },
    consentStatus: opts?.consentStatus ?? 'unknown',
    sensitivity: metric?.sensitivity ?? 'standard',
    issues,
  };
}

/** Duplicate = same metric + observedAt already seen. */
export function isDuplicate(raw: RawMeasurement, seen: Set<string>): boolean {
  const key = `${raw.metricId}|${raw.observedAt ?? ''}`;
  return seen.has(key);
}
