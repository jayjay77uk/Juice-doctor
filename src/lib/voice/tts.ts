import 'server-only';
import { isTtsConfigured } from '@/lib/env';
export const TTS_MAX_CHARS = 2_000; export const TTS_TIMEOUT_MS = 30_000;
export type TtsResult = | { ok: true; audio: ReadableStream<Uint8Array>; contentType: string } | { ok: false; error: 'provider_error' | 'timeout'; detail?: string; providerStatus?: number };
export function ttsFailureReason(result: Extract<TtsResult, { ok: false }>): string { if (result.error === 'timeout') return 'The voice service timed out — please try again.'; switch (result.providerStatus) { case 400: case 422: return 'The voice service rejected the request — check the selected ElevenLabs voice.'; case 401: case 403: return 'The voice service rejected our credentials — check ELEVENLABS_API_KEY.'; case 402: return 'The ElevenLabs plan does not allow this voice via the API — use a premade voice on the current plan.'; case 404: return 'The configured voice was not found — check the voice ID.'; case 429: return 'The voice service quota was exceeded — try again shortly.'; default: return 'Speech could not be generated — please try again.'; } }
function createElevenLabsAdapter(apiKey: string): TtsProviderAdapter {
  const call = async (text: string, voiceId: string): Promise<TtsResult> => { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS); try { const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, { method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify({ text: text.slice(0, TTS_MAX_CHARS), model_id: 'eleven_multilingual_v2' }), signal: controller.signal, cache: 'no-store' }); if (!res.ok || !res.body) { const detail = await res.text().catch(() => ''); return { ok: false, error: 'provider_error', providerStatus: res.status, detail: `elevenlabs_http_${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` }; } return { ok: true, audio: res.body, contentType: res.headers.get('content-type') ?? 'audio/mpeg' }; } catch (e) { if (e instanceof Error && e.name === 'AbortError') return { ok: false, error: 'timeout' }; return { ok: false, error: 'provider_error', detail: e instanceof Error ? e.message.slice(0, 200) : 'unknown' }; } finally { clearTimeout(timer); } };
  return {
    key: 'elevenlabs',
    async speak(text, voiceId) {
      const first = await call(text, voiceId);
      // 402 = the plan does not permit THIS voice (library voices need a paid
      // plan). Fall back once to a premade voice so the member still hears a
      // reply; the configured voice resumes automatically once the plan allows it.
      if (!first.ok && first.providerStatus === 402 && voiceId !== FREE_PREMADE_VOICE_ID) {
        const retry = await call(text, FREE_PREMADE_VOICE_ID);
        if (retry.ok) return retry;
        return first;
      }
      return first;
    },
  };
}
export interface TtsProviderAdapter { readonly key: string; speak(text: string, voiceId: string): Promise<TtsResult>; }
export function getTtsProvider(): TtsProviderAdapter | null { if (!isTtsConfigured()) return null; return createElevenLabsAdapter((process.env.ELEVENLABS_API_KEY ?? '').trim()); }
/** Rachel — an ElevenLabs premade voice usable on the free plan. */
export const FREE_PREMADE_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
export function defaultVoiceId(): string { return (process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? '').trim() || FREE_PREMADE_VOICE_ID; }