import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/services/auth';
import { getSttProvider, STT_MAX_BYTES, STT_SUPPORTED_MIME } from '@/lib/voice/stt';
import { createInMemoryRateLimiter, enforceRateLimit } from '@/lib/security/rate-limit';
import { RateLimitError } from '@/lib/security/errors';

/**
 * Voice input: transcribe a short audio clip for the signed-in member. The
 * transcript feeds the SAME conversation send path as typed text — there is no
 * separate voice conversation system. Raw audio is forwarded to the provider
 * in-flight and never stored. Answers 503 until Deepgram is credentialed.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = createInMemoryRateLimiter({ limit: 10, windowMs: 60_000 });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const provider = getSttProvider();
  if (!provider) {
    return NextResponse.json({ error: 'Voice input is not available yet — the speech service is not connected.' }, { status: 503 });
  }

  try {
    await enforceRateLimit(limiter, `stt:${session.user.id}`);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: 'Too many voice requests — please wait a minute.' }, { status: 429 });
    }
    throw e;
  }

  const contentType = (request.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (!(STT_SUPPORTED_MIME as readonly string[]).includes(contentType)) {
    return NextResponse.json({ error: `Unsupported audio format. Supported: ${STT_SUPPORTED_MIME.join(', ')}.` }, { status: 415 });
  }
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > STT_MAX_BYTES) {
    return NextResponse.json({ error: 'Audio clip is too large (max 8 MB).' }, { status: 413 });
  }
  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) return NextResponse.json({ error: 'No audio received.' }, { status: 400 });
  if (audio.byteLength > STT_MAX_BYTES) {
    return NextResponse.json({ error: 'Audio clip is too large (max 8 MB).' }, { status: 413 });
  }

  const result = await provider.transcribe(audio, contentType);
  if (!result.ok) {
    if (result.error === 'empty_transcript') {
      return NextResponse.json({ error: 'No speech was detected — please try again.' }, { status: 422 });
    }
    if (result.error === 'timeout') {
      return NextResponse.json({ error: 'Transcription timed out — please try a shorter clip.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Transcription failed — please try again or type your message.' }, { status: 502 });
  }
  return NextResponse.json({ transcript: result.transcript });
}
