import { describe, it, expect } from 'vitest';
import { voiceModesFor, modeAvailable } from './modes';

describe('voice-mode permission matrix', () => {
  it('Makela / the receptionist gets T-S and T-T but NEVER V-V', () => {
    expect(voiceModesFor('makela')).toEqual(['ts', 'tt']);
    expect(voiceModesFor('MAKELA')).toEqual(['ts', 'tt']);
    expect(voiceModesFor('receptionist')).toEqual(['ts', 'tt']);
    expect(voiceModesFor(undefined)).toEqual(['ts', 'tt']);
    expect(voiceModesFor(null)).toEqual(['ts', 'tt']);
  });

  it('every other specialist gets all three modes', () => {
    for (const slug of ['serena', 'atlas', 'aqua', 'sage', 'luca', 'felix', 'optimus']) {
      expect(voiceModesFor(slug)).toEqual(['ts', 'tt', 'vv']);
    }
  });

  it('availability tracks provider configuration honestly', () => {
    expect(modeAvailable('ts', { stt: true, tts: false })).toBe(true);
    expect(modeAvailable('ts', { stt: false, tts: true })).toBe(false);
    expect(modeAvailable('tt', { stt: true, tts: false })).toBe(false);
    expect(modeAvailable('tt', { stt: true, tts: true })).toBe(true);
    expect(modeAvailable('vv', { stt: true, tts: true })).toBe(true);
    expect(modeAvailable('vv', { stt: true, tts: false })).toBe(false);
  });
});
