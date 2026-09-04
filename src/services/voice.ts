import 'server-only';
import { isSttConfigured, isTtsConfigured } from '@/lib/env';
import { defaultVoiceId, resolveUsableVoiceId, listAccountVoices, voiceDiscoveryStatus, type AccountVoice } from '@/lib/voice/tts';
import { systemSettings } from './system-settings';
const VOICES_KEY = 'voice.specialist_voices';
export interface VoiceStatus { sttConfigured: boolean; ttsConfigured: boolean; }
export function voiceStatus(): VoiceStatus { return { sttConfigured: isSttConfigured(), ttsConfigured: isTtsConfigured() }; }
export async function specialistVoices(): Promise<Record<string, string>> { const value = await systemSettings.getValue(VOICES_KEY); if (!value || typeof value !== 'object' || Array.isArray(value)) return {}; const out: Record<string,string> = {}; for (const [slug,voiceId] of Object.entries(value as Record<string,unknown>)) if (typeof voiceId === 'string' && voiceId.trim()) out[slug]=voiceId.trim(); return out; }
export async function saveSpecialistVoices(map: Record<string,string>): Promise<boolean> { const clean: Record<string,string> = {}; for (const [slug,voiceId] of Object.entries(map)) { const s=slug.trim().toLowerCase(), v=voiceId.trim(); if (s && /^[a-z0-9-]{1,40}$/.test(s) && /^[A-Za-z0-9]{8,64}$/.test(v)) clean[s]=v; } return systemSettings.setValue(VOICES_KEY,clean); }
/**
 * The voice a specialist speaks with. Prefers the admin-configured voice for
 * that specialist, then the platform default — but always resolved against the
 * voices this ElevenLabs account can actually synthesise, so read-aloud works
 * on the free plan and upgrades itself when the plan allows the chosen voice.
 */
export async function voiceForSpecialist(slug: string | null): Promise<string> {
  const configured = slug ? (await specialistVoices())[slug] : undefined;
  return resolveUsableVoiceId(configured ?? defaultVoiceId());
}

/** Voices this ElevenLabs account can use — for the admin picker. */
export async function accountVoices(): Promise<AccountVoice[]> {
  return listAccountVoices();
}

/** Why voice discovery found nothing (401 = key problem, 402 = plan problem). */
export async function voiceDiscoveryDiagnostic(): Promise<{ status: number | null; count: number } | null> {
  await listAccountVoices();
  const d = voiceDiscoveryStatus();
  return d ? { status: d.status, count: d.count } : null;
}
