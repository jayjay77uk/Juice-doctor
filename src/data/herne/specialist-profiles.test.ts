import { describe, it, expect } from 'vitest';
import { HERNE_SPECIALIST_PROFILES, HERNE_ORDER, herneProfile } from './specialist-profiles';
import { HERNE_SHARED_DNA } from './specialist-content';

describe('HERNE specialists', () => {
  it('defines exactly the eight named specialists, coordinator first', () => {
    expect(HERNE_SPECIALIST_PROFILES.length).toBe(8);
    expect(HERNE_SPECIALIST_PROFILES.map((p) => p.specialistId)).toEqual([...HERNE_ORDER]);
    expect(HERNE_SPECIALIST_PROFILES[0]?.specialistId).toBe('makela');
  });

  it('every specialist has role, scope, boundaries, starter prompt and output format', () => {
    for (const p of HERNE_SPECIALIST_PROFILES) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.allowedActions.length).toBeGreaterThan(0);
      expect(p.mustNotDo.length).toBeGreaterThan(0);
      expect(p.starterPrompt.length).toBeGreaterThan(50);
      expect(p.greeting.length).toBeGreaterThan(0);
      expect(p.outputFormat.length).toBeGreaterThan(2);
      expect(['client_supplied', 'awaiting_client_approval']).toContain(p.greetingStatus);
    }
  });

  it('flags unsupplied content as awaiting client approval (never invented as final)', () => {
    // Makela's philosophy was not supplied
    expect(herneProfile('makela')?.philosophyStatus).toBe('awaiting_client_approval');
    // Serena's greeting + philosophy were supplied
    expect(herneProfile('serena')?.greetingStatus).toBe('client_supplied');
    expect(herneProfile('serena')?.philosophyStatus).toBe('client_supplied');
  });

  it('has the 11-point shared specialist DNA', () => {
    expect(HERNE_SHARED_DNA.length).toBe(11);
    expect(HERNE_SHARED_DNA).toContain('Warm before knowledgeable');
    expect(HERNE_SHARED_DNA).toContain('Never contradict approved shared evidence');
  });
});
