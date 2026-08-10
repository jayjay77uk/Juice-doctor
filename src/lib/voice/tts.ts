import 'server-only';

import { isTtsConfigured } from '@/lib/env';

/**
 * Text-to-speech provider abstraction. ElevenLabs is the selected provider;
 * the adapter calls its documented public REST API and exists ONLY once
 * ELEVENLABS_API_KEY + ELEVENLABS_DEFAULT_VOICE_ID are set (final connection
 * stage). Speech is generated from the REAL stored specialist reply — there is
 * no separate voice conversation system.
 */

export const TTS_MAX_CHARS = 2_000;
export const TTS_TIMEOUT_MS = 30_000;

export type TtsResult =
  | { ok: true; audio: ReadableStream<Uint8Array>; contentType: string }
  | { ok: false; error: 'provider_error' | 'timeout'; detail?: string };

export interface TtsProviderAdapter {
  readonly key: string;
  speak(text: string, voiceId: string): Promise<TtsResult>;
}

function createElevenLabsAdapter(apiKey: string): TtsProviderAdapter {
  return {
    key: 'elevenlabs',
    async speak(text: string, voiceId: string): Promise<TtsResult> {
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
          return { ok: false, error: 'provider_error', detail: `elevenlabs_http_${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` };
        }
        clearTimeout(timer);
        return { ok: true, audio: res.body, contentType: res.headers.get('content-type') ?? 'audio/mpeg' };
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return { ok: false, error: 'timeout' };
        return { ok: false, error: 'provider_error', detail: e instanceof Error ? e.message.slice(0, 200) : 'unknown' };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** The configured TTS provider, or null when voice output is not yet connected. */
export function getTtsProvider(): TtsProviderAdapter | null {
  if (!isTtsConfigured()) return null;
  return createElevenLabsAdapter(process.env.ELEVENLABS_API_KEY ?? '');
}

/** The platform-wide default voice id (required for TTS to be configured). */
export function defaultVoiceId(): string {
  return process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? '';
}
