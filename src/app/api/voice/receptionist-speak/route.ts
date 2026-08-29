import { NextResponse, type NextRequest } from 'next/server';
import { getTtsProvider, ttsFailureReason, TTS_MAX_CHARS } from '@/lib/voice/tts';
import { voiceForSpecialist } from '@/services/voice';
import { systemSettings } from '@/services/system-settings';
import { verifyReplySignature } from '@/lib/voice/reply-signature';
import { RECEPTIONIST_SLUG } from '@/lib/voice/modes';
import { createInMemoryRateLimiter, enforceRateLimit } from '@/lib/security/rate-limit';
import { RateLimitError } from '@/lib/security/errors';

/**
 * PUBLIC text-to-speech for the receptionist console's Talk→Talk mode. Only
 * text carrying a valid server HMAC signature (minted when Makela actually
 * generated that reply) is ever voiced — this endpoint cannot be used to
 * speak arbitrary text. Rate-limited per visitor IP + instance-wide.
 * Answers 503 until ElevenLabs is credentialed.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const visitorLimiter = createInMemoryRateLimiter({ limit: 10, windowMs: 60_000 });
const instanceLimiter = createInMemoryRateLimiter({ limit: 40, windowMs: 60_000 });

function visitorKey(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  const provider = getTtsProvider();
  if (!provider) {
    return NextResponse.json({ error: 'Spoken replies are not available yet — the voice service is not connected.' }, { status: 503 });
  }
  try {
    await enforceRateLimit(visitorLimiter, `rtts:${visitorKey(request)}`);
    await enforceRateLimit(instanceLimiter, 'rtts:instance');
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: 'Too many voice requests — please wait a minute.' }, { status: 429 });
    }
    throw e;
  }

  let text = '';
  let sig = '';
  try {
    const body = (await request.json()) as { text?: unknown; sig?: unknown };
    text = typeof body.text === 'string' ? body.text : '';
    sig = typeof body.sig === 'string' ? body.sig : '';
  } catch {
    // fall through to validation below
  }
  if (!text || text.length > 4000 || !sig) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  // Only genuine, server-generated replies may be spoken.
  if (!verifyReplySignature(text, sig)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const voiceId = await voiceForSpecialist(RECEPTIONIST_SLUG);
  if (!voiceId) {
    return NextResponse.json({ error: 'No voice is configured for Makela yet.' }, { status: 503 });
  }
  const result = await provider.speak(text, voiceId);
  if (!result.ok) {
    // Operator diagnostics: function log + a durable last-failure record
    // (system_settings, server/admin-only). Provider status/detail only —
    // never our credentials.
    console.error(`[tts] receptionist speak failed: ${result.detail ?? result.error}`);
    void systemSettings.setValue('voice.last_tts_error', {
      at: new Date().toISOString(),
      surface: 'receptionist-speak',
      detail: (result.detail ?? result.error).slice(0, 400),
    });
    return NextResponse.json({ error: ttsFailureReason(result) }, { status: result.error === 'timeout' ? 504 : 502 });
  }
  return new Response(result.audio, {
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'no-store',
      'X-Audio-Truncated': text.length > TTS_MAX_CHARS ? 'true' : 'false',
    },
  });
}
