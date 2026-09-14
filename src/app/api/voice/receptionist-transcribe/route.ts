import { createDistributedRateLimiter } from '@/lib/security/distributed-rate-limit';
import { NextResponse, type NextRequest } from 'next/server';
import { getSttProvider, STT_SUPPORTED_MIME } from '@/lib/voice/stt';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { RateLimitError } from '@/lib/security/errors';

/**
 * PUBLIC voice input for the receptionist console (visitors are not signed
 * in, and Makela supports Talk→Speech by design). Tighter limits than the
 * member endpoint: 4 MB clips, 6/min per visitor IP plus an instance-wide
 * cap, MIME whitelist, and audio is forwarded in-flight — never stored.
 * Answers 503 until Deepgram is credentialed.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_MAX_BYTES = 4 * 1024 * 1024;
const visitorLimiter = createDistributedRateLimiter('route-receptionist-transcribe-visitorLimiter', { limit: 6, windowMs: 60_000 });
const instanceLimiter = createDistributedRateLimiter('route-receptionist-transcribe-instanceLimiter', { limit: 30, windowMs: 60_000 });

function visitorKey(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  const provider = getSttProvider();
  if (!provider) {
    return NextResponse.json({ error: 'Voice input is not available yet — the speech service is not connected.' }, { status: 503 });
  }
  try {
    await enforceRateLimit(visitorLimiter, `rstt:${visitorKey(request)}`);
    await enforceRateLimit(instanceLimiter, 'rstt:instance');
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
  if (Number.isFinite(declaredLength) && declaredLength > PUBLIC_MAX_BYTES) {
    return NextResponse.json({ error: 'Audio clip is too large (max 4 MB).' }, { status: 413 });
  }
  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) return NextResponse.json({ error: 'No audio received.' }, { status: 400 });
  if (audio.byteLength > PUBLIC_MAX_BYTES) {
    return NextResponse.json({ error: 'Audio clip is too large (max 4 MB).' }, { status: 413 });
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
