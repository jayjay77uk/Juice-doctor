/**
 * Pure baseline + trend generation. The system prefers trends over isolated
 * readings and never treats a single measurement as diagnostic.
 */

export interface Series {
  value: number;
  observedAt: string;
}

export interface TrendSummary {
  window: 'weekly' | 'monthly';
  average: number;
  baseline: number;
  deviation: number;
  direction: 'up' | 'down' | 'stable';
  confidence: number;
  coverage: number;
  missingNotice: string | null;
  n: number;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Personal baseline = mean of the series (or the baseline window when given). */
export function computeBaseline(values: number[]): number {
  return round(mean(values));
}

export function computeTrend(series: Series[], opts?: { recent?: number; window?: 'weekly' | 'monthly' }): TrendSummary {
  const window = opts?.window ?? 'weekly';
  const sorted = [...series].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const values = sorted.map((s) => s.value);
  if (!values.length) {
    return { window, average: 0, baseline: 0, deviation: 0, direction: 'stable', confidence: 0, coverage: 0, missingNotice: 'No data available.', n: 0 };
  }
  const recentN = opts?.recent ?? Math.max(1, Math.round(values.length / 3));
  const recent = values.slice(-recentN);
  const baselineVals = values.slice(0, values.length - recentN);
  const baseline = mean(baselineVals.length ? baselineVals : values);
  const recentAvg = mean(recent);
  const deviation = round(recentAvg - baseline);
  const sd = stddev(values);
  const threshold = Math.max(0.001, sd * 0.5);
  const direction: TrendSummary['direction'] = deviation > threshold ? 'up' : deviation < -threshold ? 'down' : 'stable';
  const expected = window === 'monthly' ? 30 : 7;
  const coverage = Math.min(1, values.length / expected);
  const confidence = round(coverage * (values.length >= 3 ? 1 : 0.5));
  return {
    window,
    average: round(recentAvg),
    baseline: round(baseline),
    deviation,
    direction,
    confidence,
    coverage: round(coverage),
    missingNotice: coverage < 0.5 ? 'Limited data — this trend is low-confidence.' : null,
    n: values.length,
  };
}
