/**
 * Voice communication modes — the single source of truth for which modes each
 * AI supports. Pure module (no server imports) so both UI and tests share it.
 *
 *  - 'ts' (Talk → Speech/Text): the user may dictate; the AI replies in text.
 *  - 'tt' (Talk → Talk): as 'ts', plus the AI's replies are spoken aloud.
 *  - 'vv' (Voice → Voice): hands-free voice-first loop over the same thread.
 *
 * Permission matrix (fixed product requirement):
 *  - Makela / the receptionist: ts + tt (NEVER vv)
 *  - Every other specialist:    ts + tt + vv
 *
 * Availability is a separate question: a permitted mode still shows an honest
 * disabled state until the STT/TTS providers are credentialed.
 */

export type VoiceMode = 'ts' | 'tt' | 'vv';

export const RECEPTIONIST_SLUG = 'makela';

/** The modes this AI is PERMITTED to offer (independent of provider status). */
export function voiceModesFor(slug: string | null | undefined): VoiceMode[] {
  const s = (slug ?? '').trim().toLowerCase();
  if (!s || s === RECEPTIONIST_SLUG || s === 'receptionist') return ['ts', 'tt'];
  return ['ts', 'tt', 'vv'];
}

/** Whether a mode is currently USABLE given provider configuration. */
export function modeAvailable(mode: VoiceMode, providers: { stt: boolean; tts: boolean }): boolean {
  if (mode === 'ts') return providers.stt;
  return providers.stt && providers.tts;
}
