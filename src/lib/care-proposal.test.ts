import { describe, expect, it } from 'vitest';
import { safeCareProposal } from './care-proposal';
describe('care proposal guard', () => {
  const base = { title: 'Evening routine', detail: 'Try keeping a consistent bedtime.', evidenceRefs: ['HERNE-S-001'] };
  it('accepts bounded wellbeing proposals backed by supplied references', () => expect(safeCareProposal(base, ['HERNE-S-001'])).toEqual(base));
  it('rejects fabricated references', () => expect(safeCareProposal(base, [])).toBeNull());
  it.each(['You have diabetes.', 'Double your medication dose.', 'Take 500mg every day.', 'Try this supplement.', 'Exercise through chest pain.'])('blocks clinical/unsafe proposal %s', detail => {
    expect(safeCareProposal({ ...base, detail }, ['HERNE-S-001'])).toBeNull();
  });
});
