import { describe, it, expect } from 'vitest';
import { herneTeamRoster, teamRosterFor, HERNE_INSTITUTION_CONTEXT, HERNE_COMMUNICATION_VOICE } from './team';

describe('HERNE team awareness', () => {
  it('exposes all eight specialists with expertise, concierge first', () => {
    const roster = herneTeamRoster();
    expect(roster).toHaveLength(8);
    expect(roster[0]?.slug).toBe('makela');
    for (const m of roster) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.expertise.length).toBeGreaterThan(0);
    }
  });

  it('marks the current specialist as "(you)" and lists every colleague', () => {
    const block = teamRosterFor('aqua');
    // Aqua is the current specialist.
    expect(block).toMatch(/Aqua \(you\)/);
    // Every other specialist is named as a colleague to hand off to.
    for (const name of ['Makela', 'Serena', 'Atlas', 'Sage', 'Luca', 'Felix', 'Optimus']) {
      expect(block).toContain(name);
      expect(block).toMatch(new RegExp(`${name} — .*The right colleague for`));
    }
    // The current specialist is not offered as a colleague to hand off to.
    expect(block).not.toMatch(/Aqua — .*The right colleague for/);
  });

  it('shares an institution context that names the coordinated model + policies', () => {
    expect(HERNE_INSTITUTION_CONTEXT).toMatch(/shared, approved evidence base/);
    expect(HERNE_INSTITUTION_CONTEXT).toMatch(/ONE shared care plan/);
    expect(HERNE_INSTITUTION_CONTEXT).toMatch(/not medical diagnosis|not.*diagnosis/i);
    expect(HERNE_INSTITUTION_CONTEXT).toMatch(/Makela is the concierge/);
  });

  it('gives a natural, non-robotic communication voice with warm handoffs', () => {
    expect(HERNE_COMMUNICATION_VOICE).toMatch(/never like a script or an AI assistant/i);
    expect(HERNE_COMMUNICATION_VOICE).toMatch(/Never describe yourself as an AI/i);
    expect(HERNE_COMMUNICATION_VOICE).toMatch(/Name the colleague best placed to help/i);
    expect(HERNE_COMMUNICATION_VOICE).toMatch(/never have to repeat themselves/i);
  });
});
