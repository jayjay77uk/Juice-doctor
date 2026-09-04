import 'server-only';
import { isSttConfigured, isTtsConfigured } from '@/lib/env';
import { defaultVoiceId } from '@/lib/voice/tts';
import { systemSettings } from './system-settings';
const VOICES_KEY = 'voice.specialist_voices';
export interface VoiceStatus { sttConfigured: boolean; ttsConfigured: boolean; }
export function voiceStatus(): VoiceStatus { return { sttConfigured: isSttConfigured(), ttsConfigured: isTtsConfigured() }; }
export async function specialistVoices(): Promise<Record<string, string>> { const value = await systemSettings.getValue(VOICES_KEY); if (!value || typeof value !== 'object' || Array.isArray(value)) return {}; const out: Record<string,string> = {}; for (const [slug,voiceId] of Object.entries(value as Record<string,unknown>)) if (typeof voiceId === 'string' && voiceId.trim()) out[slug]=voiceId.trim(); return out; }
export async function saveSpecialistVoices(map: Record<string,string>): Promise<boolean> { const clean: Record<string,string> = {}; for (const [slug,voiceId] of Object.entries(map)) { const s=slug.trim().toLowerCase(), v=voiceId.trim(); if (s && /^[a-z0-9-]{1,40}$/.test(s) && /^[A-Za-z0-9]{8,64}$/.test(v)) clean[s]=v; } return systemSettings.setValue(VOICES_KEY,clean); }
/** Temporary demo policy: ignore any previously configured library voice and use the free premade default for every specialist. */
export async function voiceForSpecialist(_slug: string | null): Promise<string> { return defaultVoiceId(); }