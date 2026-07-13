import { describe, it, expect } from 'vitest';
import {
  HERNE_LANGUAGES,
  HERNE_DEFAULT_LANGUAGE,
  herneLanguage,
  resolveLanguageCode,
  isRtlLanguage,
} from '@/data/herne/languages';
import {
  resolveLanguagePreference,
  languageDirective,
  describePreference,
  specialistVoiceCapability,
  HERNE_CAPABILITIES,
  HERNE_DEFAULT_PREFERENCE,
} from './language';

describe('HERNE language catalogue', () => {
  it('lists the default language first with unique codes and native names', () => {
    expect(HERNE_LANGUAGES[0]?.code).toBe(HERNE_DEFAULT_LANGUAGE);
    const codes = HERNE_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const l of HERNE_LANGUAGES) {
      expect(l.englishName.length).toBeGreaterThan(0);
      expect(l.nativeName.length).toBeGreaterThan(0);
    }
  });

  it('flags right-to-left languages correctly', () => {
    expect(isRtlLanguage('ar')).toBe(true);
    expect(isRtlLanguage('ur')).toBe(true);
    expect(isRtlLanguage('en-GB')).toBe(false);
    expect(isRtlLanguage('es')).toBe(false);
  });

  it('resolves unknown codes to the default', () => {
    expect(resolveLanguageCode('klingon')).toBe(HERNE_DEFAULT_LANGUAGE);
    expect(resolveLanguageCode(undefined)).toBe(HERNE_DEFAULT_LANGUAGE);
    expect(resolveLanguageCode('es')).toBe('es');
    expect(herneLanguage('es')?.nativeName).toBe('Español');
  });
});

describe('HERNE language preference resolution', () => {
  it('defaults a null/garbage preference safely', () => {
    expect(resolveLanguagePreference(null)).toEqual(HERNE_DEFAULT_PREFERENCE);
    expect(resolveLanguagePreference({ language: 42 as unknown as string })).toEqual(HERNE_DEFAULT_PREFERENCE);
  });

  it('keeps a valid dialect but strips one that does not belong to the language', () => {
    expect(resolveLanguagePreference({ language: 'es', dialect: 'Castilian' }).dialect).toBe('Castilian');
    expect(resolveLanguagePreference({ language: 'es', dialect: 'Brazilian' }).dialect).toBeNull();
    // A dialect for a language that has none is dropped.
    expect(resolveLanguagePreference({ language: 'de', dialect: 'Bavarian' }).dialect).toBeNull();
  });

  it('coerces the voice desire to a boolean', () => {
    expect(resolveLanguagePreference({ language: 'es', voice: true }).voice).toBe(true);
    expect(resolveLanguagePreference({ language: 'es', voice: 'yes' as unknown as boolean }).voice).toBe(false);
  });
});

describe('HERNE language directive', () => {
  it('produces no directive for the default English preference', () => {
    expect(languageDirective(resolveLanguagePreference({ language: 'en-GB' }))).toBeNull();
    expect(languageDirective(HERNE_DEFAULT_PREFERENCE)).toBeNull();
  });

  it('instructs the specialist to answer in the chosen language, safely', () => {
    const d = languageDirective(resolveLanguagePreference({ language: 'es', dialect: 'Latin American' }));
    expect(d).toContain('Spanish');
    expect(d).toContain('Español');
    expect(d).toContain('Latin American');
    // Safety-preserving: cautions kept intact, no guessing clinical terms.
    expect(d).toMatch(/safety|caution/i);
    expect(d).toMatch(/English term in brackets/i);
  });
});

describe('HERNE capability model (honest live/planned split)', () => {
  it('reports text as live, language as prototype, voice as planned', () => {
    expect(HERNE_CAPABILITIES.text.status).toBe('live');
    expect(HERNE_CAPABILITIES.language.status).toBe('prototype');
    expect(HERNE_CAPABILITIES.voice.status).toBe('planned');
    expect(HERNE_CAPABILITIES.dialect.status).toBe('planned');
  });

  it('exposes a shared specialist voice/text capability with voice not yet live', () => {
    const cap = specialistVoiceCapability();
    expect(cap.text).toBe('live');
    expect(cap.voice).toBe('planned');
  });

  it('describes a preference in a human-readable way', () => {
    expect(describePreference(resolveLanguagePreference({ language: 'en-GB' }))).toBe('English');
    expect(describePreference(resolveLanguagePreference({ language: 'es', dialect: 'Castilian' }))).toBe('Spanish (Español) · Castilian');
  });
});
