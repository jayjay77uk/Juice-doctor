import { describe, it, expect } from 'vitest';
import { loadWearableCatalog, EXPECTED_METRIC_COUNT, parseSpecialistAccess } from './catalog';
import { canSpecialistAccessMetric, permittedMetricsFor } from './access';
import { normaliseMeasurement, checkQuality, isDuplicate, type RawMeasurement } from './normalise';
import { computeBaseline, computeTrend } from './trends';
import { createMockThryveAdapter } from './thryve-adapter';

describe('wearable metric catalogue', () => {
  it('loads exactly the client catalogue count (15)', () => {
    expect(loadWearableCatalog().length).toBe(EXPECTED_METRIC_COUNT);
    expect(EXPECTED_METRIC_COUNT).toBe(15);
  });
  it('parses specialist access, including "All except Felix"', () => {
    expect(parseSpecialistAccess('Optimus; Atlas; Serena; Makela')).toEqual(['optimus', 'atlas', 'serena', 'makela']);
    const allButFelix = parseSpecialistAccess('All except Felix');
    expect(allButFelix).not.toContain('felix');
    expect(allButFelix).toContain('optimus');
    expect(allButFelix.length).toBe(7);
  });
});

describe('specialist access control', () => {
  it('permits only catalogue-authorised specialists', () => {
    // HRV is Optimus + Atlas only
    expect(permittedMetricsFor('optimus')).toContain('heart_rate_variability');
    expect(permittedMetricsFor('luca')).not.toContain('heart_rate_variability');
  });
  it('requires consent before access even when permitted', () => {
    const withConsent = canSpecialistAccessMetric({ specialistId: 'optimus', metricId: 'heart_rate_variability', consentGranted: true });
    const noConsent = canSpecialistAccessMetric({ specialistId: 'optimus', metricId: 'heart_rate_variability', consentGranted: false });
    expect(withConsent.allowed).toBe(true);
    expect(noConsent.allowed).toBe(false);
    expect(noConsent.reasons).toContain('consent_required');
  });
  it('denies a non-permitted specialist and blocks poor-quality data', () => {
    const denied = canSpecialistAccessMetric({ specialistId: 'luca', metricId: 'heart_rate_variability', consentGranted: true });
    expect(denied.allowed).toBe(false);
    expect(denied.reasons).toContain('specialist_not_permitted');
    const poor = canSpecialistAccessMetric({ specialistId: 'optimus', metricId: 'heart_rate_variability', consentGranted: true, quality: 'poor' });
    expect(poor.allowed).toBe(false);
  });
});

describe('normalisation + data quality', () => {
  const good: RawMeasurement = { userId: 'u', metricId: 'resting_heart_rate', value: 60, unit: 'bpm', provider: 'thryve_mock', observedAt: new Date().toISOString(), confidence: 0.9 };
  it('normalises to the canonical model with baseline + deviation', () => {
    const n = normaliseMeasurement(good, { baseline: 58 });
    expect(n.canonicalName).toBe('Resting Heart Rate');
    expect(n.deviation).toBe(2);
    expect(n.dataQuality).toBe('good');
  });
  it('flags impossible values as poor quality', () => {
    const bad = normaliseMeasurement({ ...good, value: 900 });
    expect(bad.dataQuality).toBe('poor');
    expect(bad.issues.some((i) => i.code === 'impossible_value')).toBe(true);
  });
  it('detects unit mismatch and missing timestamp', () => {
    const issues = checkQuality({ ...good, unit: 'wrong', observedAt: undefined as unknown as string });
    expect(issues.some((i) => i.code === 'unit_mismatch')).toBe(true);
    expect(issues.some((i) => i.code === 'missing_timestamp')).toBe(true);
  });
  it('detects stale data', () => {
    const old = new Date(Date.now() - 200 * 3_600_000).toISOString();
    const issues = checkQuality({ ...good, observedAt: old });
    expect(issues.some((i) => i.code === 'stale_data')).toBe(true);
  });
  it('detects duplicates', () => {
    const seen = new Set(['resting_heart_rate|2026-07-01T07:00:00.000Z']);
    expect(isDuplicate({ ...good, observedAt: '2026-07-01T07:00:00.000Z' }, seen)).toBe(true);
    expect(isDuplicate({ ...good, observedAt: '2026-07-02T07:00:00.000Z' }, seen)).toBe(false);
  });
});

describe('baselines + trends', () => {
  it('computes a baseline and a directional trend', () => {
    expect(computeBaseline([10, 20, 30])).toBe(20);
    const rising = computeTrend(
      [50, 51, 52, 60, 62, 64].map((v, i) => ({ value: v, observedAt: `2026-07-0${i + 1}T07:00:00Z` })),
      { recent: 3 },
    );
    expect(rising.direction).toBe('up');
    expect(rising.n).toBe(6);
  });
  it('flags low-confidence trends when coverage is poor', () => {
    const t = computeTrend([{ value: 60, observedAt: '2026-07-01T07:00:00Z' }], { window: 'weekly' });
    expect(t.confidence).toBeLessThan(0.5);
    expect(t.missingNotice).toBeTruthy();
  });
});

describe('mock Thryve adapter contract', () => {
  it('implements the adapter interface and returns fixtures (no live calls)', async () => {
    const a = createMockThryveAdapter();
    expect(a.isMock).toBe(true);
    const conn = await a.createConnection('user-1234');
    expect(conn.status).toBe('connected');
    const measurements = await a.fetchMeasurements('user-1234');
    expect(measurements.length).toBeGreaterThan(0);
    expect(a.verifyWebhook('mock-signature', '{}')).toBe(true);
    expect(a.verifyWebhook('bad', '{}')).toBe(false);
    const norm = a.normaliseMeasurement(measurements[0]!);
    expect(norm.canonicalName.length).toBeGreaterThan(0);
  });
});
