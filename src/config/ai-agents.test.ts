import { describe, it, expect } from 'vitest';
import { DEFAULT_AI_AGENTS } from './ai-agents';
import { HERNE_SPECIALIST_PROFILES, HERNE_ORDER } from '@/data/herne/specialist-profiles';

/**
 * Guards the "exactly eight specialists" invariant. The eight user-facing
 * specialists are the client-approved HERNE team. The static seed roster contains
 * ONLY the receptionist (routing infrastructure) — no legacy specialist
 * placeholders — so a fresh install creates exactly eight specialists (all HERNE)
 * plus the one receptionist.
 */

const EXPECTED = ['makela', 'serena', 'atlas', 'aqua', 'sage', 'luca', 'felix', 'optimus'];

describe('AI agent roster', () => {
  it('seeds no specialist agents statically — only the receptionist', () => {
    const specialists = DEFAULT_AI_AGENTS.filter((a) => a.kind === 'specialist');
    expect(specialists).toHaveLength(0);
    const receptionists = DEFAULT_AI_AGENTS.filter((a) => a.kind === 'receptionist');
    expect(receptionists).toHaveLength(1);
  });

  it('contains no retired "specialist-ai-*" placeholder slugs', () => {
    for (const a of DEFAULT_AI_AGENTS) {
      expect(a.slug).not.toMatch(/specialist-ai-/);
    }
  });

  it('defines exactly the eight approved HERNE specialists', () => {
    expect(HERNE_SPECIALIST_PROFILES).toHaveLength(8);
    expect(HERNE_ORDER).toHaveLength(8);
    expect([...HERNE_ORDER].sort()).toEqual([...EXPECTED].sort());
    expect(HERNE_SPECIALIST_PROFILES.map((p) => p.specialistId).sort()).toEqual([...EXPECTED].sort());
  });

  it('starts with Makela as the concierge', () => {
    expect(HERNE_ORDER[0]).toBe('makela');
  });
});
