import { describe, expect, it } from 'vitest';
import { hasDemoAccess } from './demo-access';

describe('designated demo access', () => {
  it('allows only the specified account, normalising case and whitespace', () => {
    expect(hasDemoAccess(' JimohMujeeb8204@gmail.com ')).toBe(true);
    for (const email of [undefined, null, '', 'jimohmujeeb820@gmail.com', 'other@example.com']) {
      expect(hasDemoAccess(email)).toBe(false);
    }
  });
});
