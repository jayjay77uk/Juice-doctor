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
