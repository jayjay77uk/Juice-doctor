import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSttProvider } from './stt';
import { getTtsProvider, defaultVoiceId } from './tts';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('voice provider gating', () => {
  it('STT has NO provider until DEEPGRAM_API_KEY exists', () => {
    vi.stubEnv('DEEPGRAM_API_KEY', '');
    expect(getSttProvider()).toBeNull();
    vi.stubEnv('DEEPGRAM_API_KEY', 'dg-key');
    expect(getSttProvider()?.key).toBe('deepgram');
  });

  it('TTS has NO provider until ELEVENLABS_API_KEY + default voice exist', () => {
    vi.stubEnv('ELEVENLABS_API_KEY', '');
    vi.stubEnv('ELEVENLABS_DEFAULT_VOICE_ID', '');
    expect(getTtsProvider()).toBeNull();
    vi.stubEnv('ELEVENLABS_API_KEY', 'el-key');
    expect(getTtsProvider()).toBeNull(); // still needs a voice id
    vi.stubEnv('ELEVENLABS_DEFAULT_VOICE_ID', 'Voice123456');
    expect(getTtsProvider()?.key).toBe('elevenlabs');
    expect(defaultVoiceId()).toBe('Voice123456');
  });
});

describe('deepgram adapter', () => {
  it('extracts the transcript from the documented response shape', async () => {
    vi.stubEnv('DEEPGRAM_API_KEY', 'dg-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ results: { channels: [{ alternatives: [{ transcript: 'hello there' }] }] } }), { status: 200 }),
      ),
    );
    const result = await getSttProvider()!.transcribe(new ArrayBuffer(8), 'audio/webm');
    expect(result).toEqual({ ok: true, transcript: 'hello there' });
  });

  it('reports empty_transcript when no speech was detected', async () => {
    vi.stubEnv('DEEPGRAM_API_KEY', 'dg-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ results: { channels: [{ alternatives: [{ transcript: '' }] }] } }), { status: 200 }),
      ),
    );
    const result = await getSttProvider()!.transcribe(new ArrayBuffer(8), 'audio/webm');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('empty_transcript');
  });

  it('classifies provider HTTP failures', async () => {
    vi.stubEnv('DEEPGRAM_API_KEY', 'dg-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 401 })));
    const result = await getSttProvider()!.transcribe(new ArrayBuffer(8), 'audio/webm');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('provider_error');
  });
});

describe('elevenlabs adapter', () => {
  it('returns the audio stream on success', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'el-key');
    vi.stubEnv('ELEVENLABS_DEFAULT_VOICE_ID', 'Voice123456');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(new Blob([new Uint8Array([1, 2, 3])]).stream(), { status: 200, headers: { 'content-type': 'audio/mpeg' } })),
    );
    const result = await getTtsProvider()!.speak('Hello', 'Voice123456');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.contentType).toBe('audio/mpeg');
  });

  it('classifies provider failures without fabricating audio', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'el-key');
    vi.stubEnv('ELEVENLABS_DEFAULT_VOICE_ID', 'Voice123456');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('quota', { status: 429 })));
    const result = await getTtsProvider()!.speak('Hello', 'Voice123456');
    expect(result.ok).toBe(false);
  });
});

describe('TTS failure reasons (operator-facing, no secrets)', () => {
  it('maps provider status classes to honest actionable messages', async () => {
    const { ttsFailureReason } = await import('./tts');
    expect(ttsFailureReason({ ok: false, error: 'provider_error', providerStatus: 401 })).toContain('ELEVENLABS_API_KEY');
    expect(ttsFailureReason({ ok: false, error: 'provider_error', providerStatus: 404 })).toContain('voice was not found');
    expect(ttsFailureReason({ ok: false, error: 'provider_error', providerStatus: 400 })).toContain('My Voices');
    expect(ttsFailureReason({ ok: false, error: 'provider_error', providerStatus: 402 })).toContain('upgrade the ElevenLabs subscription');
    expect(ttsFailureReason({ ok: false, error: 'provider_error', providerStatus: 429 })).toContain('quota');
    expect(ttsFailureReason({ ok: false, error: 'timeout' })).toContain('timed out');
    expect(ttsFailureReason({ ok: false, error: 'provider_error' })).toContain('could not be generated');
  });

  it('trims a pasted default voice id', async () => {
    const { defaultVoiceId } = await import('./tts');
    const vi_ = await import('vitest');
    vi_.vi.stubEnv('ELEVENLABS_DEFAULT_VOICE_ID', ' O4fnkotIypvedJqBp4yb\n');
    expect(defaultVoiceId()).toBe('O4fnkotIypvedJqBp4yb');
    vi_.vi.unstubAllEnvs();
  });
});
