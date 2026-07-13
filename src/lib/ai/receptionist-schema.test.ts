import { describe, it, expect } from 'vitest';
import { parseReceptionistResult } from './receptionist-schema';

describe('receptionist structured-output validation', () => {
  const valid = {
    summary: 'The visitor wants help choosing a service.',
    identifiedNeeds: ['guidance'],
    relevantFacts: [],
    unansweredQuestions: [],
    recommendedSpecialistIds: ['aqua'],
    primaryRecommendation: 'aqua',
    alternativeRecommendations: ['serena'],
    confidence: 0.72,
    escalationRequired: false,
    escalationReason: null,
    suggestedNextAction: 'Recommend Aqua.',
  };

  it('accepts a well-formed result', () => {
    const r = parseReceptionistResult(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.confidence).toBe(0.72);
  });

  it('rejects out-of-range confidence', () => {
    const r = parseReceptionistResult({ ...valid, confidence: 1.5 });
    expect(r.ok).toBe(false);
  });

  it('rejects a missing summary', () => {
    const { summary: _omit, ...rest } = valid;
    const r = parseReceptionistResult(rest);
    expect(r.ok).toBe(false);
  });

  it('rejects a non-boolean escalation flag', () => {
    const r = parseReceptionistResult({ ...valid, escalationRequired: 'yes' });
    expect(r.ok).toBe(false);
  });

  it('defaults optional arrays', () => {
    const r = parseReceptionistResult({
      summary: 's',
      primaryRecommendation: null,
      confidence: 0.4,
      escalationRequired: true,
      escalationReason: 'insufficient information',
      suggestedNextAction: 'Escalate to the team.',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.identifiedNeeds).toEqual([]);
  });
});
