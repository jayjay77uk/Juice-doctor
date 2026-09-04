import { describe, it, expect } from 'vitest';
import { postcheckOutput, citedRecordIds } from './safety-eval';

const ALLOWED = ['HERNE-H-001', 'HERNE-N-003'];

describe('diagnosis detection — no false clinical-review escalations', () => {
  it('does NOT flag ordinary conversational phrasing containing "you have"', () => {
    // Verbatim from a real Luca reply that was wrongly escalated for
    // "unsupported-claim review" purely because it contained "you have".
    const reply =
      "So, tell me a bit about what's going on for you — and it'd help to know about any allergies, " +
      'intolerances, cultural/taste preferences, or goals you have in mind.';
    const result = postcheckOutput(reply, ALLOWED);
    expect(result.issues).not.toContain('unsupported_diagnosis');
    expect(result.mustEscalate).toBe(false);
    expect(result.ok).toBe(true);
  });

  it('does NOT flag other benign uses', () => {
    for (const text of [
      'If you have any questions, just ask.',
      "Let me know what you have in the fridge and I'll build a meal around it.",
      "You have options here — we can go either way.",
    ]) {
      expect(postcheckOutput(text, ALLOWED).mustEscalate).toBe(false);
    }
  });

  it('STILL flags genuine diagnosis claims', () => {
    for (const text of [
      'Based on this, you have hypothyroidism.',
      'You have an iron deficiency.',
      'I diagnose insulin resistance.',
      'You are diabetic.',
      "You've got IBS.",
      'You\u2019ve got coeliac disease.',
    ]) {
      const result = postcheckOutput(text, ALLOWED);
      expect(result.issues, text).toContain('unsupported_diagnosis');
      expect(result.mustEscalate, text).toBe(true);
    }
  });
});

describe('citations reflect what the reply actually used', () => {
  it('returns nothing for a conversational answer that cites no record', () => {
    // "who are you" style answer — must not claim unrelated evidence.
    expect(citedRecordIds("Hey there — I'm Luca, the nutrition planner.", ALLOWED)).toEqual([]);
  });

  it('returns only cited, permitted records (deduped)', () => {
    const text = 'Hydration matters [HERNE-H-001] and protein too [HERNE-N-003]. Again [HERNE-H-001].';
    expect(citedRecordIds(text, ALLOWED).sort()).toEqual(['HERNE-H-001', 'HERNE-N-003']);
  });

  it('ignores record ids the model was not given (fabricated)', () => {
    expect(citedRecordIds('Made up [HERNE-X-999].', ALLOWED)).toEqual([]);
  });
});

describe('diagnosis detection — clause boundary', () => {
  it('does not reach across a clause into an unrelated condition word', () => {
    expect(
      postcheckOutput('Let me know if you have questions about your thyroid tests.', ALLOWED).mustEscalate,
    ).toBe(false);
  });

  it('catches qualified diagnoses', () => {
    for (const text of ['You have a mild vitamin D deficiency.', "You've got early osteoporosis."]) {
      expect(postcheckOutput(text, ALLOWED).mustEscalate, text).toBe(true);
    }
  });
});

describe('diagnosis detection — conditional caveats are not diagnoses', () => {
  it('does NOT flag safety caveats (the specialist SHOULD give these)', () => {
    for (const text of [
      'Higher protein is generally safe unless you have kidney disease or a metabolic condition.',
      'If you have coeliac disease, we would swap the oats.',
      'Do you have any thyroid problems I should know about?',
      'Whether you have IBS or not, fibre is worth building up slowly.',
    ]) {
      expect(postcheckOutput(text, ALLOWED).mustEscalate, text).toBe(false);
    }
  });

  it('STILL flags direct assertions about this member', () => {
    for (const text of [
      'You have kidney disease.',
      'Based on what you describe, you have an iron deficiency.',
    ]) {
      expect(postcheckOutput(text, ALLOWED).mustEscalate, text).toBe(true);
    }
  });
});
