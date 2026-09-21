import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/services/auth';
import { conversationsRepo, type AssistantTurn } from '@/services/repositories/conversations-repo';
import { agents } from '@/services/agents';
import { streamHerneReply, isHerneSpecialist } from '@/services/herne/reply';
import { specialistReply } from '@/services/specialist-reply';
import { checkUsageLimit, acquireSlot, releaseSlot } from '@/services/ai-usage';
import { subscriptionsService } from '@/services/subscriptions';
import { hasConsent } from '@/services/consents';
import { pendingToolRequests } from '@/services/agent-tools';
import { regenerationInput } from '@/lib/chat-regeneration';

/**
 * Streaming specialist turn (NDJSON). The client POSTs { content }; we authenticate,
 * verify ownership, enforce per-user usage limits, persist the user turn, stream the
 * grounded HERNE reply as it generates, then persist the assistant turn with its full
 * metadata (citations, escalation, cost, trace). Cancellation: the client aborting the
 * fetch aborts request.signal, which cancels the provider stream.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function line(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const conv = await conversationsRepo.byId(id);
  if (!conv.ok || conv.data.userId !== userId || conv.data.status === 'deleted') {
    // Soft-deleted threads are gone from the member's perspective — 404, not 409.
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  }
  if (conv.data.status !== 'active') {
    return NextResponse.json({ error: 'This conversation is archived. Start a new conversation to continue.' }, { status: 409 });
  }

  let content = '';
  let regenerate = false;
  let regenerated: ReturnType<typeof regenerationInput> = null;
  try {
    const body = (await request.json()) as { content?: unknown; regenerate?: unknown };
    regenerate = body.regenerate === true;
    content = typeof body.content === 'string' ? body.content.trim() : '';
  } catch {
    content = '';
  }
  if (regenerate) {
    const stored = await conversationsRepo.messages(id);
    if (!stored.ok) return NextResponse.json({ error: 'Conversation history unavailable.' }, { status: 503 });
    regenerated = regenerationInput(stored.data);
    if (!regenerated) return NextResponse.json({ error: 'There is no message to regenerate.' }, { status: 400 });
    content = regenerated.content;
  }
  if (!content) return NextResponse.json({ error: 'Please enter a message.' }, { status: 400 });
  if (content.length > 4000) return NextResponse.json({ error: 'Message is too long (max 4000 characters).' }, { status: 400 });
  if (conv.data.context.human_takeover === true) {
    if (regenerate) return NextResponse.json({ error: 'AI is paused while the care team handles this conversation.' }, { status: 409 });
    await conversationsRepo.insertUserMessage(id, content);
    return new Response(`${JSON.stringify({ type: 'accepted', humanTakeover: true })}\n`, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
  }
  if (!(await hasConsent(userId, 'ai_processing'))) return NextResponse.json({ error: 'AI processing consent is required. Review your consent in Settings.' }, { status: 403 });

  // Per-user usage limits (daily/monthly, counted from ai_run_logs).
  const limit = await checkUsageLimit(userId);
  if (!limit.allowed) return NextResponse.json({ error: limit.message }, { status: 429 });

  const agentResult = conv.data.agentId ? await agents.byId(conv.data.agentId) : { ok: false as const };
  const agent = agentResult.ok ? agentResult.data : null;
  if (!agent || agent.status !== 'active') return NextResponse.json({ error: 'This specialist is currently unavailable.' }, { status: 410 });

  // Subscription access: chatting with a specialist requires an active
  // subscription that covers it — enforced here as well as at creation. A
  // store failure is reported honestly, never as a billing problem.
  if (agent && agent.kind === 'specialist') {
    const access = await subscriptionsService.memberAccess(userId);
    if (!access.ok) {
      return NextResponse.json({ error: 'We could not check your subscription just now. Please try again shortly.' }, { status: 503 });
    }
    if (!access.data.includes(agent.slug)) {
      return NextResponse.json({ error: 'Your plan does not include this specialist. Please review your subscription.' }, { status: 403 });
    }
  }

  // Per-user concurrency guard, acquired BEFORE the user turn is persisted so
  // a denial never leaves an orphaned message. It closes the
  // check-then-proceed window on the usage limit above and bounds parallel AI
  // spend; released when the stream finishes (the response outlives this
  // handler) or on any failure before the stream is returned.
  if (!acquireSlot(userId)) {
    return NextResponse.json({ error: 'Please wait for your current reply to finish.' }, { status: 429 });
  }

  let history;
  try {
    history = regenerated?.history ?? await conversationsRepo.historyFor(id);
    if (!regenerate) await conversationsRepo.insertUserMessage(id, content);
  } catch (e) {
    releaseSlot(userId);
    throw e;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (agent && isHerneSpecialist(agent.slug)) {
          for await (const chunk of streamHerneReply(agent, history, content, { userId, conversationId: id, signal: request.signal })) {
            if (chunk.type === 'delta') {
              controller.enqueue(line({ type: 'delta', text: chunk.text }));
            } else {
              const r = chunk.reply;
              const turn: AssistantTurn = {
                content: r.text,
                specialist: r.specialist,
                language: r.language,
                citations: r.citations,
                escalated: r.escalationRecommended,
                referral: r.referralSuggestion,
                safetyState: r.safety.blocked ? 'blocked' : r.safety.issues.length ? 'flagged' : 'ok',
                model: r.model,
                tokensOutput: r.usage?.outputTokens ?? null,
                latencyMs: r.latencyMs,
                costUsd: r.costUsd,
                traceId: r.traceId,
                promptVersionId: r.promptVersion?.id ?? null,
              };
              const message = await conversationsRepo.insertAssistantMessage(id, turn);
              if (!message) throw new Error('Reply could not be saved.');
              controller.enqueue(line({ type: 'final', message, escalated: r.escalationRecommended, referral: r.referralSuggestion, citations: r.citations, escalationReason: r.escalationReason }));
            }
          }
        } else {
          // Non-HERNE agent: no streaming provider path — reply then emit as one chunk.
          const reply = agent
            ? await specialistReply(agent, history, content, { userId, conversationId: id })
            : { text: 'Thanks for your message. A member of the team will follow up with you.', citations: [], grounded: false, available: false };
          const message = await conversationsRepo.insertAssistantMessage(id, { content: reply.text, model: agent?.defaultModelId ?? null });
          if (!message) throw new Error('Reply could not be saved.');
          controller.enqueue(line({ type: 'final', message, escalated: false, referral: null, citations: [] }));
        }
      } catch {
        controller.enqueue(line({ type: 'error', error: 'The reply could not be completed.' }));
      } finally {
        releaseSlot(userId);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { id } = await params;
  const conv = await conversationsRepo.byId(id);
  if (!conv.ok || conv.data.userId !== session.user.id || conv.data.status === 'deleted') return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  const [messages, pending] = await Promise.all([conversationsRepo.messages(id), pendingToolRequests(session.user.id, id)]);
  if (!messages.ok) return NextResponse.json({ error: 'Messages unavailable.' }, { status: 503 });
  return NextResponse.json({ messages: messages.data, pending, humanTakeover: conv.data.context.human_takeover === true }, { headers: { 'Cache-Control': 'no-store' } });
}
