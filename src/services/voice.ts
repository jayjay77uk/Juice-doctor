import 'server-only';

import { isSttConfigured, isTtsConfigured } from '@/lib/env';
import { defaultVoiceId } from '@/lib/voice/tts';
import { systemSettings } from './system-settings';

/**
 * Voice service — configuration state + per-specialist voice mapping. Voice is
 * an input/output layer over the SAME real conversation pathway as typed
 * messages: transcripts feed the normal send flow, and speech is generated
 * from the stored specialist reply. Until Deepgram/ElevenLabs are credentialed
 * every surface reports voice as honestly unavailable.
 */

const VOICES_KEY = 'voice.specialist_voices';

export interface VoiceStatus {
  sttConfigured: boolean;
  ttsConfigured: boolean;
}

export function voiceStatus(): VoiceStatus {
  return { sttConfigured: isSttConfigured(), ttsConfigured: isTtsConfigured() };
}

/** Admin-configured ElevenLabs voice id per specialist slug. */
export async function specialistVoices(): Promise<Record<string, string>> {
  const value = await systemSettings.getValue(VOICES_KEY);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [slug, voiceId] of Object.entries(value as Record<string, unknown>)) {
    if (typeof voiceId === 'string' && voiceId.trim()) out[slug] = voiceId.trim();
  }
  return out;
}

export async function saveSpecialistVoices(map: Record<string, string>): Promise<boolean> {
  const clean: Record<string, string> = {};
  for (const [slug, voiceId] of Object.entries(map)) {
    const s = slug.trim().toLowerCase();
    const v = voiceId.trim();
    // ElevenLabs voice ids are short alphanumerics; reject anything else.
    if (s && /^[a-z0-9-]{1,40}$/.test(s) && /^[A-Za-z0-9]{8,64}$/.test(v)) clean[s] = v;
  }
  return systemSettings.setValue(VOICES_KEY, clean);
}

/** The voice to use for a specialist: configured mapping, else platform default. */
export async function voiceForSpecialist(slug: string | null): Promise<string> {
  const voices = await specialistVoices();
  return (slug ? voices[slug] : undefined) ?? defaultVoiceId();
}
