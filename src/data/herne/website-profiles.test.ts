import { describe, it, expect } from 'vitest';
import { websiteProfiles, websiteProfile, HERNE_MULTILINGUAL_STATEMENT } from './website-profiles';

describe('HERNE public specialist experience', () => {
  it('exposes exactly the eight specialists, Makela first', () => {
    const p = websiteProfiles();
    expect(p.length).toBe(8);
    expect(p[0]?.slug).toBe('makela');
    expect(p.map((x) => x.slug).sort()).toEqual(['aqua', 'atlas', 'felix', 'luca', 'makela', 'optimus', 'sage', 'serena']);
  });

  it('has correct names + client titles + routable slugs', () => {
    expect(websiteProfile('makela')?.title).toBe('Your Wellbeing Concierge');
    expect(websiteProfile('serena')?.title).toContain("Women's Health");
    expect(websiteProfile('optimus')?.title).toContain('Longevity');
    for (const p of websiteProfiles()) {
      expect(p.slug).toMatch(/^[a-z]+$/);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('presents Makela as the concierge / entry point', () => {
    expect(websiteProfile('makela')?.isConcierge).toBe(true);
    expect(websiteProfiles().filter((p) => p.isConcierge).length).toBe(1);
  });

  it('uses supplied portraits for Makela + Serena and flags the rest awaiting approval', () => {
    expect(websiteProfile('makela')?.portrait).toBe('/specialists/makela.png');
    expect(websiteProfile('makela')?.portraitStatus).toBe('client_supplied');
    expect(websiteProfile('serena')?.portrait).toBe('/specialists/serena.png');
    for (const slug of ['atlas', 'aqua', 'sage', 'luca', 'felix', 'optimus']) {
      expect(websiteProfile(slug)?.portrait).toBeNull();
      expect(websiteProfile(slug)?.portraitStatus).toBe('awaiting_client_approval');
    }
  });

  it('loads structured client copy for every specialist (no empty profiles)', () => {
    for (const p of websiteProfiles()) {
      expect(p.opening.length).toBeGreaterThan(0);
      expect(p.intro.length).toBeGreaterThan(0);
      expect(p.howICanHelp.length).toBeGreaterThan(2);
      expect(p.closing.length).toBeGreaterThan(0);
      expect(p.copyStatus).toBe('client_supplied');
    }
  });

  it('exposes the approved multilingual + voice statement', () => {
    expect(HERNE_MULTILINGUAL_STATEMENT).toContain('preferred language');
    expect(HERNE_MULTILINGUAL_STATEMENT).toContain('voice or text');
  });
});
