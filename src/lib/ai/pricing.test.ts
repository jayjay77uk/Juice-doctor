import { describe, it, expect } from 'vitest';
import { rateForModel, estimateCostUsd } from './pricing';

describe('AI cost estimation', () => {
  it('matches a model by longest prefix', () => {
    expect(rateForModel('claude-sonnet-5-20991231').inputPerMTok).toBe(3);
    expect(rateForModel('claude-3-5-haiku-latest').inputPerMTok).toBe(0.8);
  });

  it('prices current models at list rates', () => {
    expect(rateForModel('claude-fable-5')).toEqual({ inputPerMTok: 10, outputPerMTok: 50 });
    // Opus 4.5+ list price is $5/$25 (longest prefix beats the bare opus-4 entry)…
    expect(rateForModel('claude-opus-4-8').outputPerMTok).toBe(25);
    expect(rateForModel('claude-opus-4-6').inputPerMTok).toBe(5);
    // …while legacy Opus 4.0/4.1 stay on $15/$75.
    expect(rateForModel('claude-opus-4-1').outputPerMTok).toBe(75);
    expect(rateForModel('claude-opus-4-0').inputPerMTok).toBe(15);
    expect(rateForModel('claude-haiku-4-5').inputPerMTok).toBe(1);
  });

  it('falls back to a conservative non-zero default for unknown models', () => {
    const r = rateForModel('some-future-model');
    expect(r.inputPerMTok).toBeGreaterThan(0);
    expect(r.outputPerMTok).toBeGreaterThan(0);
  });

  it('estimates cost from token usage', () => {
    // 1M input @ $3 + 1M output @ $15 = $18
    expect(estimateCostUsd('claude-sonnet-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(18, 5);
    // small call rounds to micro-dollars, never negative
    const c = estimateCostUsd('claude-sonnet-5', { inputTokens: 1200, outputTokens: 300 });
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(0.01);
  });

  it('returns 0 when usage is unknown', () => {
    expect(estimateCostUsd('claude-sonnet-5', null)).toBe(0);
    expect(estimateCostUsd('claude-sonnet-5', undefined)).toBe(0);
  });
});
