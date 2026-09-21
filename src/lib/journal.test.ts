import { describe, expect, it } from 'vitest';
import { journalSchema } from './journal';
describe('journal validation', () => {
  const valid = { entryDate: '2026-09-15', title: 'Today', body: 'A reflection' };
  it('accepts a valid entry', () => expect(journalSchema.safeParse(valid).success).toBe(true));
  it.each(['2026-02-30', 'not-a-date', '2026-13-01'])('rejects invalid date %s', entryDate => {
    expect(journalSchema.safeParse({ ...valid, entryDate }).success).toBe(false);
  });
  it('rejects oversized and empty entries', () => {
    expect(journalSchema.safeParse({ ...valid, body: 'a'.repeat(5001) }).success).toBe(false);
    expect(journalSchema.safeParse({ ...valid, title: ' ' }).success).toBe(false);
  });
});
