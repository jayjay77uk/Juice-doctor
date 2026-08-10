/**
 * HERNE multilingual & voice model (pure — no `server-only`, so it is unit-tested
 * and shared by the client selector, the reply assembler and the stores).
 *
 * Two honest ideas kept separate:
 *   1. A person's PREFERENCE — the language, optional dialect, and whether they want
 *      voice. A preference can be expressed before a capability exists.
 *   2. The platform CAPABILITY — what is actually live today versus planned.
 *      Text conversations in the chosen language are produced by the AI and work now,
 *      but are AI-generated (not clinically human-reviewed); voice and separately
 *      verified dialect coverage are NOT connected. The UI must never imply otherwise.
 */

import {
  HERNE_DEFAULT_LANGUAGE,
  herneLanguage,
  resolveLanguageCode,
  type HerneLanguage,
} from '@/data/herne/languages';

export type CapabilityStatus = 'live' | 'planned';

export interface LanguagePreference {
  /** Supported BCP-47 code (always a catalogue member; defaults to English). */
  language: string;
  /** An offered regional variety, or null for none / not applicable. */
  dialect: string | null;
  /** Whether the person has asked for voice — desire, not availability. */
  voice: boolean;
}

export const HERNE_DEFAULT_PREFERENCE: LanguagePreference = {
  language: HERNE_DEFAULT_LANGUAGE,
  dialect: null,
  voice: false,
};

export interface Capability {
  status: CapabilityStatus;
  label: string;
  note: string;
}

/**
 * The capability model — the SINGLE place that states what is live. Referenced by
 * the settings card and the public statement so the live/planned labelling can
 * never drift from reality.
 */
export const HERNE_CAPABILITIES: Record<'text' | 'language' | 'dialect' | 'voice', Capability> = {
  text: {
    status: 'live',
    label: 'Text conversations',
    note: 'Chat with any specialist by text is available now.',
  },
  language: {
    status: 'live',
    label: 'Preferred language',
    note: 'Specialists can reply in your chosen language. Replies are AI-generated and not yet human-reviewed for clinical accuracy — English remains the reference version.',
  },
  dialect: {
    status: 'planned',
    label: 'Regional dialects',
    note: 'You can express a dialect preference; separately verified dialect coverage is planned, not yet live.',
  },
  voice: {
    status: 'planned',
    label: 'Voice conversations',
    note: 'Speaking with your specialists by voice is planned. Voice input and output are not yet connected.',
  },
};

/** Is voice actually usable today? (Single source for gating the UI toggle.) */
export const HERNE_VOICE_LIVE = HERNE_CAPABILITIES.voice.status === 'live';

/**
 * Every HERNE specialist is designed to converse by both voice and text — this is a
 * shared team capability, not a per-specialist differentiator. Exposed as a flag so
 * the website/dashboard can render it consistently against the honest status above.
 */
export function specialistVoiceCapability(): { text: CapabilityStatus; voice: CapabilityStatus } {
  return { text: HERNE_CAPABILITIES.text.status, voice: HERNE_CAPABILITIES.voice.status };
}

/** Shape persisted under `user_preferences.preferences.herne_language` (jsonb). */
export interface StoredLanguagePreference {
  language?: unknown;
  dialect?: unknown;
  voice?: unknown;
}

/**
 * Validate an untrusted stored/inbound preference into a safe LanguagePreference.
 * Unknown languages fall back to the default; a dialect is only kept if it belongs
 * to the resolved language; voice is coerced to a boolean. Never throws.
 */
export function resolveLanguagePreference(raw: StoredLanguagePreference | null | undefined): LanguagePreference {
  if (!raw || typeof raw !== 'object') return { ...HERNE_DEFAULT_PREFERENCE };
  const language = resolveLanguageCode(typeof raw.language === 'string' ? raw.language : undefined);
  const lang = herneLanguage(language);
  const wantedDialect = typeof raw.dialect === 'string' ? raw.dialect : null;
  const dialect = wantedDialect && lang?.dialects.includes(wantedDialect) ? wantedDialect : null;
  return { language, dialect, voice: raw.voice === true };
}

/**
 * The prompt directive that makes a specialist answer in the chosen language.
 * Returns null for the default English preference (no directive needed). Keeps
 * safety, citations and caution intact, and instructs the model NOT to guess
 * clinical terminology — surfacing the English term rather than fabricating one.
 */
export function languageDirective(pref: LanguagePreference): string | null {
  const lang = herneLanguage(pref.language);
  if (!lang || lang.code === HERNE_DEFAULT_LANGUAGE) return null;
  const dialect = pref.dialect ? ` Where natural, use the ${pref.dialect} variety.` : '';
  return [
    `LANGUAGE — The person has chosen to communicate in ${lang.englishName} (${lang.nativeName}).`,
    `Respond ENTIRELY in ${lang.englishName}, using warm, natural phrasing a fluent native speaker would use.${dialect}`,
    `Keep every safety caution, citation and escalation notice fully intact and equally clear in ${lang.englishName}.`,
    `If you are unsure of the correct ${lang.englishName} clinical term, keep the English term in brackets rather than guessing.`,
  ].join(' ');
}

/** A short, human sentence describing the active language choice (for logs / UI). */
export function describePreference(pref: LanguagePreference, lang: HerneLanguage | undefined = herneLanguage(pref.language)): string {
  if (!lang) return 'English';
  const base = lang.code === HERNE_DEFAULT_LANGUAGE ? lang.englishName : `${lang.englishName} (${lang.nativeName})`;
  return pref.dialect ? `${base} · ${pref.dialect}` : base;
}
