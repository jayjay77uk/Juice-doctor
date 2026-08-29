import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/services/auth';
import { getTtsProvider, ttsFailureReason, TTS_MAX_CHARS } from '@/lib/voice/tts';
import { voiceForSpecialist } from '@/services/voice';
import { conversationsRepo } from '@/services/repositories/conversations-repo';
import { agents } from '@/services/agents';
import { createInMemoryRateLimiter, enforceRateLimit } from '@/lib/security/rate-limit';
import { RateLimitError } from '@/lib/security/errors';

/**
 * Voice output: speak a STORED specialist reply aloud. The message id is
 * ownership-checked through its conversation — speech is only ever generated
 * from the member's own real conversation content, never from arbitrary text.
 * Answers 503 until ElevenLabs is credentialed.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = createInMemoryRateLimiter({ limit: 15, windowMs: 60_000 });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const provider = getTtsProvider();
  if (!provider) {
    return NextResponse.json({ error: 'Read-aloud is not available yet — the voice service is not connected.' }, { status: 503 });
  }

  try {
    await enforceRateLimit(limiter, `tts:${session.user.id}`);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: 'Too many read-aloud requests — please wait a minute.' }, { status: 429 });
    }
    throw e;
  }

  let messageId = '';
  try {
    const body = (await request.json()) as { messageId?: unknown };
    messageId = typeof body.messageId === 'string' ? body.messageId : '';
  } catch {
    messageId = '';
  }
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) {
    return NextResponse.json({ error: 'Invalid message.' }, { status: 400 });
  }

  const message = await conversationsRepo.assistantMessageForUser(session.user.id, messageId);
  if (!message.ok) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  let specialistSlug: string | null = null;
  if (message.data.agentId) {
    const agent = await agents.byId(message.data.agentId);
    if (agent.ok) specialistSlug = agent.data.slug;
  }
  const voiceId = await voiceForSpecialist(specialistSlug);
  if (!voiceId) {
    return NextResponse.json({ error: 'No voice is configured for this specialist yet.' }, { status: 503 });
  }

  const result = await provider.speak(message.data.content, voiceId);
  if (!result.ok) {
    return NextResponse.json({ error: ttsFailureReason(result) }, { status: result.error === 'timeout' ? 504 : 502 });
  }
  // Long replies are spoken up to the provider limit; signal partial audio
  // honestly rather than presenting truncated speech as the whole reply.
  const truncated = message.data.content.length > TTS_MAX_CHARS;
  return new Response(result.audio, {
    headers: { 'Content-Type': result.contentType, 'Cache-Control': 'no-store', 'X-Audio-Truncated': truncated ? 'true' : 'false' },
  });
}
