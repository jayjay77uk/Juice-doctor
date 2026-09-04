import 'server-only';
import { isTtsConfigured } from '@/lib/env';

/**
 * ElevenLabs text-to-speech.
 *
 * Free-plan reality: an account can only synthesise voices that are actually in
 * ITS OWN voice list. Many legacy "premade" ids (Rachel et al.) now live in the
 * paid Voice Library, so hardcoding one produces 402 paid_plan_required. Instead
 * the adapter DISCOVERS the account's usable voices (GET /v1/voices) and falls
 * back to one of those, so read-aloud works on whatever plan is active and the
 * configured voice takes over automatically once the plan allows it.
 */

export const TTS_MAX_CHARS = 2_000;
export const TTS_TIMEOUT_MS = 30_000;
/** Rachel — the historical premade id; kept as a last-resort hint only. */
export const FREE_PREMADE_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export type TtsResult =
  | { ok: true; audio: ReadableStream<Uint8Array>; contentType: string }
  | { ok: false; error: 'provider_error' | 'timeout'; detail?: string; providerStatus?: number };

export interface AccountVoice { voiceId: string; name: string; category: string }

export function ttsFailureReason(result: Extract<TtsResult, { ok: false }>): string {
  if (result.error === 'timeout') return 'The voice service timed out — please try again.';
  switch (result.providerStatus) {
    case 400:
    case 422:
      return 'The voice service rejected the request — check the selected ElevenLabs voice.';
    case 401:
    case 403:
      return 'The voice service rejected our credentials — check ELEVENLABS_API_KEY.';
    case 402:
      return 'This ElevenLabs plan cannot use the selected voice via the API. Add a voice to “My Voices” in ElevenLabs (or upgrade the plan) — the platform will use it automatically.';
    case 404:
      return 'The configured voice was not found — check the voice ID.';
    case 429:
      return 'The voice service quota was exceeded — try again shortly.';
    default:
      return 'Speech could not be generated — please try again.';
  }
}

/** Voices this API key may actually synthesise. Cached briefly per instance. */
let voiceCache: { at: number; voices: AccountVoice[] } | null = null;
const VOICE_TTL_MS = 5 * 60_000;

/** Last /v1/voices outcome — so the admin page can say WHY no voice is usable. */
let lastDiscovery: { status: number | null; count: number; at: number } | null = null;
export function voiceDiscoveryStatus(): { status: number | null; count: number; at: number } | null {
  return lastDiscovery;
}

export async function listAccountVoices(force = false): Promise<AccountVoice[]> {
  const apiKey = (process.env.ELEVENLABS_API_KEY ?? '').trim();
  if (!apiKey) return [];
  if (!force && voiceCache && Date.now() - voiceCache.at < VOICE_TTL_MS) return voiceCache.voices;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      lastDiscovery = { status: res.status, count: 0, at: Date.now() };
      return voiceCache?.voices ?? [];
    }
    const body = (await res.json().catch(() => null)) as { voices?: { voice_id?: string; name?: string; category?: string }[] } | null;
    const voices = (body?.voices ?? [])
      .filter((v) => typeof v.voice_id === 'string' && v.voice_id)
      .map((v) => ({ voiceId: String(v.voice_id), name: String(v.name ?? 'Voice'), category: String(v.category ?? 'unknown') }));
    voiceCache = { at: Date.now(), voices };
    lastDiscovery = { status: res.status, count: voices.length, at: Date.now() };
    return voices;
  } catch {
    return voiceCache?.voices ?? [];
  } finally {
    clearTimeout(timer);
  }
}

/** A voice from the account to fall back to, preferring cheaper premade ones. */
async function fallbackVoice(exclude: string): Promise<AccountVoice | null> {
  const voices = await listAccountVoices();
  const usable = voices.filter((v) => v.voiceId !== exclude);
  return usable.find((v) => v.category === 'premade') ?? usable[0] ?? null;
}

function createElevenLabsAdapter(apiKey: string): TtsProviderAdapter {
  const call = async (text: string, voiceId: string): Promise<TtsResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: text.slice(0, TTS_MAX_CHARS), model_id: 'eleven_multilingual_v2' }),
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => '');
        return { ok: false, error: 'provider_error', providerStatus: res.status, detail: `elevenlabs_http_${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` };
      }
      return { ok: true, audio: res.body, contentType: res.headers.get('content-type') ?? 'audio/mpeg' };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return { ok: false, error: 'timeout' };
      return { ok: false, error: 'provider_error', detail: e instanceof Error ? e.message.slice(0, 200) : 'unknown' };
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    key: 'elevenlabs',
    async speak(text, voiceId) {
      const first = await call(text, voiceId);
      // A voice-specific rejection (plan/library/not-found) is recoverable: try
      // a voice this account genuinely owns rather than failing the member.
      const voiceRejected = !first.ok && [400, 402, 404, 422].includes(first.providerStatus ?? 0);
      if (!voiceRejected) return first;

      const alt = await fallbackVoice(voiceId);
      if (!alt) {
        return { ...(first as Extract<TtsResult, { ok: false }>), detail: `${first.ok ? '' : first.detail ?? ''} | no_account_voice_available` };
      }
      const retry = await call(text, alt.voiceId);
      if (retry.ok) return retry;
      const why = `failed_${retry.ok ? 'ok' : retry.providerStatus ?? retry.error}`;
      return { ...(first as Extract<TtsResult, { ok: false }>), detail: `${first.ok ? '' : first.detail ?? ''} | fallback(${alt.name}/${alt.category})=${why}` };
    },
  };
}

export interface TtsProviderAdapter {
  readonly key: string;
  speak(text: string, voiceId: string): Promise<TtsResult>;
}

export function getTtsProvider(): TtsProviderAdapter | null {
  if (!isTtsConfigured()) return null;
  return createElevenLabsAdapter((process.env.ELEVENLABS_API_KEY ?? '').trim());
}

export function defaultVoiceId(): string {
  return (process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? '').trim() || FREE_PREMADE_VOICE_ID;
}

/**
 * The voice to actually synthesise with: the configured one when the account
 * owns it, otherwise the best voice the account does own. Keeps "free mode"
 * working now and switches to the configured voice the moment it is allowed.
 */
export async function resolveUsableVoiceId(preferred?: string | null): Promise<string> {
  const want = (preferred ?? '').trim() || defaultVoiceId();
  const voices = await listAccountVoices();
  if (!voices.length) return want; // cannot verify — try the configured one
  if (voices.some((v) => v.voiceId === want)) return want;
  const alt = voices.find((v) => v.category === 'premade') ?? voices[0];
  return alt ? alt.voiceId : want;
}
