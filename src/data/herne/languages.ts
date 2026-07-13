/**
 * HERNE supported-language catalogue (structured config — never hardcoded in UI).
 *
 * The client statement promises that "every specialist can communicate by voice or
 * text in multiple languages and dialects". This catalogue is the single source of
 * truth for which languages the experience offers a person to choose from, their
 * native names (for the selector), text direction, and illustrative regional
 * varieties. It carries NO claim that any language is clinically verified — see the
 * capability model in `services/herne/language.ts` for the honest live/planned split.
 */

export interface HerneLanguage {
  /** BCP-47 primary tag — the stable key stored against a person's preference. */
  code: string;
  englishName: string;
  /** Endonym, shown in the selector so a speaker recognises their own language. */
  nativeName: string;
  /** Right-to-left script (drives `dir="rtl"` where the UI renders sample text). */
  rtl: boolean;
  /**
   * Illustrative regional varieties — offered as a preference, NOT a guarantee of
   * separately verified dialect coverage (dialect fidelity is prototype/planned).
   */
  dialects: string[];
}

/** The default language when a person has expressed no preference. */
export const HERNE_DEFAULT_LANGUAGE = 'en-GB';

/**
 * Curated launch set. Ordered with English first (the concierge's default), then
 * broadly by reach. Extending the list needs no schema change — the preference is
 * stored as a code and validated against this catalogue at read time.
 */
export const HERNE_LANGUAGES: HerneLanguage[] = [
  { code: 'en-GB', englishName: 'English', nativeName: 'English', rtl: false, dialects: ['British', 'American', 'Nigerian', 'Indian', 'Caribbean'] },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', rtl: false, dialects: ['Castilian', 'Latin American'] },
  { code: 'fr', englishName: 'French', nativeName: 'Français', rtl: false, dialects: ['Metropolitan', 'Canadian', 'West African'] },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', rtl: false, dialects: [] },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', rtl: false, dialects: ['European', 'Brazilian'] },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano', rtl: false, dialects: [] },
  { code: 'nl', englishName: 'Dutch', nativeName: 'Nederlands', rtl: false, dialects: [] },
  { code: 'pl', englishName: 'Polish', nativeName: 'Polski', rtl: false, dialects: [] },
  { code: 'tr', englishName: 'Turkish', nativeName: 'Türkçe', rtl: false, dialects: [] },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', rtl: true, dialects: ['Modern Standard', 'Levantine', 'Gulf', 'Egyptian', 'Maghrebi'] },
  { code: 'ur', englishName: 'Urdu', nativeName: 'اردو', rtl: true, dialects: [] },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', rtl: false, dialects: [] },
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা', rtl: false, dialects: [] },
  { code: 'zh', englishName: 'Chinese (Mandarin)', nativeName: '中文', rtl: false, dialects: ['Simplified', 'Traditional'] },
  { code: 'yo', englishName: 'Yoruba', nativeName: 'Yorùbá', rtl: false, dialects: [] },
  { code: 'ig', englishName: 'Igbo', nativeName: 'Igbo', rtl: false, dialects: [] },
  { code: 'sw', englishName: 'Swahili', nativeName: 'Kiswahili', rtl: false, dialects: [] },
];

/** Look up a language by exact BCP-47 code (undefined if not in the catalogue). */
export function herneLanguage(code: string | null | undefined): HerneLanguage | undefined {
  if (!code) return undefined;
  return HERNE_LANGUAGES.find((l) => l.code === code);
}

/** Normalise an arbitrary code to a supported one, falling back to the default. */
export function resolveLanguageCode(code: string | null | undefined): string {
  return herneLanguage(code)?.code ?? HERNE_DEFAULT_LANGUAGE;
}

/** Whether the given (possibly unknown) code maps to a right-to-left language. */
export function isRtlLanguage(code: string | null | undefined): boolean {
  return herneLanguage(code)?.rtl ?? false;
}

/** The default language row — guaranteed present. */
export const HERNE_DEFAULT_LANGUAGE_ROW: HerneLanguage =
  HERNE_LANGUAGES.find((l) => l.code === HERNE_DEFAULT_LANGUAGE) ?? (HERNE_LANGUAGES[0] as HerneLanguage);
