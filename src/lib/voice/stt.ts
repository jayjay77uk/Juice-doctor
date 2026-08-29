import 'server-only';

import { isSttConfigured } from '@/lib/env';

/**
 * Speech-to-text provider abstraction. Deepgram is the selected provider; the
 * adapter below calls its documented public REST API and is constructed ONLY
 * once DEEPGRAM_API_KEY exists (final connection stage). Until then
 * `getSttProvider()` returns null and every voice surface shows an honest
 * "voice is not available yet" state. Raw audio is transcribed in-flight and
 * never stored by the platform.
 */

export const STT_MAX_BYTES = 8 * 1024 * 1024; // 8 MB per clip
export const STT_TIMEOUT_MS = 30_000;

/** Browser-recordable formats we accept (validated server-side). */
export const STT_SUPPORTED_MIME = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'] as const;

export type SttResult =
  | { ok: true; transcript: string }
  | { ok: false; error: 'provider_error' | 'timeout' | 'empty_transcript'; detail?: string };

export interface SttProviderAdapter {
  readonly key: string;
  transcribe(audio: ArrayBuffer, mimeType: string): Promise<SttResult>;
}

const DEEPGRAM_ENDPOINT = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en';

function createDeepgramAdapter(apiKey: string): SttProviderAdapter {
  return {
    key: 'deepgram',
    async transcribe(audio: ArrayBuffer, mimeType: string): Promise<SttResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), STT_TIMEOUT_MS);
      try {
        const res = await fetch(DEEPGRAM_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Token ${apiKey}`, 'Content-Type': mimeType },
          body: audio,
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          return { ok: false, error: 'provider_error', detail: `deepgram_http_${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` };
        }
        const body = (await res.json().catch(() => null)) as {
          results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
        } | null;
        const transcript = body?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? '';
        if (!transcript) return { ok: false, error: 'empty_transcript' };
        return { ok: true, transcript };
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return { ok: false, error: 'timeout' };
        return { ok: false, error: 'provider_error', detail: e instanceof Error ? e.message.slice(0, 200) : 'unknown' };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** The configured STT provider, or null when voice input is not yet connected. */
export function getSttProvider(): SttProviderAdapter | null {
  if (!isSttConfigured()) return null;
  return createDeepgramAdapter((process.env.DEEPGRAM_API_KEY ?? '').trim());
}
