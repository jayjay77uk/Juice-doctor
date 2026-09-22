import { describe, it, expect } from 'vitest';
import { followUpId, followUpPeriods } from './follow-up';
describe('follow-up deduplication', () => {
  it('keeps weekly keys stable across Sunday and starts a new week on Monday', () => {
    expect(followUpPeriods(new Date('2026-09-20T23:59:00Z')).week).toBe('2026-09-14');
    expect(followUpPeriods(new Date('2026-09-21T00:00:00Z')).week).toBe('2026-09-21');
  });
  it('keeps retries stable and separates recipients and periods', () => {
    expect(followUpId('a:daily:2026-09-21')).toBe(followUpId('a:daily:2026-09-21'));
    expect(followUpId('a:daily:2026-09-21')).not.toBe(followUpId('b:daily:2026-09-21'));
    expect(followUpId('a:daily:2026-09-21')).not.toBe(followUpId('a:daily:2026-09-22'));
  });
});
