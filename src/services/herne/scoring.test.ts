import { describe, it, expect } from 'vitest';
import { parseRecords, type HerneEvidenceRecord } from './records';
import { scoreEvidence, type ScoreInput } from './scoring';

function toInput(r: HerneEvidenceRecord): ScoreInput {
  return {
    specialistRelevance: r.specialist_relevance,
    primaryPillar: r.herne.primary_pillar,
    evidenceStrength: String((r.evidence as { strength?: unknown }).strength ?? ''),
    status: r.status,
    safetyHasReviewFlag: Array.isArray(r.safety.human_review_when) && r.safety.human_review_when.length > 0,
    text: `${r.claim} ${r.document_text}`,
  };
}

describe('HERNE retrieval scoring', () => {
  it('ranks the SAME shared evidence differently per specialist', () => {
    const { valid } = parseRecords();
    const hydration = valid.find((v) => v.record.id === 'HERNE-H-001')?.record;
    expect(hydration).toBeTruthy();
    const input = toInput(hydration!);
    // For the hydration record, Aqua is primary (priority 1.0), Felix is background (0.2).
    const aqua = scoreEvidence(input, 'aqua', 'hydration and fatigue');
    const felix = scoreEvidence(input, 'felix', 'hydration and fatigue');
    expect(aqua.specialistPriority).toBeGreaterThan(felix.specialistPriority);
    expect(aqua.final).toBeGreaterThan(felix.final); // same evidence, higher for Aqua
  });

  it('retains a full explainable score breakdown', () => {
    const { valid } = parseRecords();
    const input = toInput(valid[0]!.record);
    const s = scoreEvidence(input, 'makela', 'general wellbeing');
    for (const k of ['semantic', 'specialistPriority', 'hernePillar', 'goal', 'evidenceQuality', 'reviewStatus', 'contraindicationPenalty', 'scopeMismatchPenalty', 'final'] as const) {
      expect(typeof s[k]).toBe('number');
    }
  });

  it('does not rank solely by semantic similarity (priority moves the final score)', () => {
    const { valid } = parseRecords();
    const input = toInput(valid.find((v) => v.record.id === 'HERNE-H-001')!.record);
    // identical query for both, so semantic is equal; only specialist priority differs
    const aqua = scoreEvidence(input, 'aqua', 'water');
    const felix = scoreEvidence(input, 'felix', 'water');
    expect(aqua.semantic).toBe(felix.semantic);
    expect(aqua.final).not.toBe(felix.final);
  });
});
