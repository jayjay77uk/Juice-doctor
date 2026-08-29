import { describe, it, expect } from 'vitest';
import { parseReceptionistTurnResult } from './receptionist-turn-schema';

describe('receptionist turn schema', () => {
  it('accepts a conversational continue turn', () => {
    const result = parseReceptionistTurnResult({
      reply: 'I can help you talk through what is going on and connect you with the right specialist. What has been on your mind?',
      action: 'continue',
      primaryRecommendation: null,
      alternativeRecommendations: [],
      confidence: 0,
      summary: null,
      escalationReason: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.action).toBe('continue');
  });

  it('accepts a recommendation with slug + confidence + summary', () => {
    const result = parseReceptionistTurnResult({
      reply: 'Serena sounds like the right fit for this.',
      action: 'recommend',
      primaryRecommendation: 'serena',
      alternativeRecommendations: ['makela'],
      confidence: 0.85,
      summary: 'The visitor described hormonal health concerns.',
      escalationReason: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.primaryRecommendation).toBe('serena');
  });

  it('rejects malformed turns (empty reply, bad action, out-of-range confidence)', () => {
    expect(parseReceptionistTurnResult({ reply: '', action: 'continue', primaryRecommendation: null }).ok).toBe(false);
    expect(parseReceptionistTurnResult({ reply: 'x', action: 'interrogate', primaryRecommendation: null }).ok).toBe(false);
    expect(
      parseReceptionistTurnResult({ reply: 'x', action: 'recommend', primaryRecommendation: 'serena', confidence: 1.5 }).ok,
    ).toBe(false);
  });
});
