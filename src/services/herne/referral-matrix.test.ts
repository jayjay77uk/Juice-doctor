import { describe, it, expect } from 'vitest';
import { loadReferralMatrix, isHumanEscalation, classifyRules } from './referral-matrix';

describe('HERNE referral matrix', () => {
  it('loads exactly the 15 client referral rules', () => {
    expect(loadReferralMatrix().length).toBe(15);
  });

  it('classifies human / clinical escalations vs specialist-to-specialist', () => {
    expect(isHumanEscalation('Human clinical review')).toBe(true);
    expect(isHumanEscalation('Sage')).toBe(false);
    expect(isHumanEscalation('Felix')).toBe(false);
    const human = classifyRules().filter((r) => r.isHumanEscalation);
    // the six human-review rules (Aqua/Serena/Atlas/Felix/Optimus + the Any->Human emergency rule)
    expect(human.length).toBe(6);
  });

  it('includes the emergency Any → Human clinical review pathway', () => {
    const any = loadReferralMatrix().find((r) => r.from_specialist === 'Any');
    expect(any).toBeTruthy();
    expect(isHumanEscalation(any!.to_specialist)).toBe(true);
  });

  it('includes specialist-to-specialist and specialist-to-Makela handoffs', () => {
    const rules = loadReferralMatrix();
    expect(rules.some((r) => r.from_specialist === 'Aqua' && r.to_specialist === 'Sage')).toBe(true);
    expect(rules.some((r) => r.from_specialist === 'Makela')).toBe(true);
  });
});

describe('specialist reference normalisation', () => {
  it('maps display names to runtime slugs case-insensitively', async () => {
    const { normalizeSpecialistRef } = await import('./referral-matrix');
    expect(normalizeSpecialistRef('Aqua')).toBe('aqua');
    expect(normalizeSpecialistRef('SAGE')).toBe('sage');
    expect(normalizeSpecialistRef('makela')).toBe('makela');
  });

  it('identifies wildcard references', async () => {
    const { isWildcardRef } = await import('./referral-matrix');
    expect(isWildcardRef('Any')).toBe(true);
    expect(isWildcardRef('Any specialist')).toBe(true);
    expect(isWildcardRef('Relevant specialist')).toBe(true);
    expect(isWildcardRef('Sage')).toBe(false);
  });

  it('every named from_specialist in the matrix resolves to a real slug', async () => {
    const { normalizeSpecialistRef, isWildcardRef, loadReferralMatrix } = await import('./referral-matrix');
    const { herneProfile } = await import('@/data/herne/specialist-profiles');
    for (const rule of loadReferralMatrix()) {
      if (isWildcardRef(rule.from_specialist)) continue;
      expect(herneProfile(normalizeSpecialistRef(rule.from_specialist)), rule.from_specialist).toBeTruthy();
    }
  });
});
