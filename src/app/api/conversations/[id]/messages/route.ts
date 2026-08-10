import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/services/auth';
import { conversationsRepo, type AssistantTurn } from '@/services/repositories/conversations-repo';
import { agents } from '@/services/agents';
import { streamHerneReply, isHerneSpecialist } from '@/services/herne/reply';
import { specialistReply } from '@/services/specialist-reply';
import { checkUsageLimit, acquireSlot, releaseSlot } from '@/services/ai-usage';
import { subscriptionsService } from '@/services/subscriptions';

/**
 * Streaming specialist turn (NDJSON). The client POSTs { content }; we authenticate,
 * verify ownership, enforce prototype usage limits, persist the user turn, stream the
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
  if (!conv.ok || conv.data.userId !== userId) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  if (conv.data.status !== 'active') {
    return NextResponse.json({ error: 'This conversation is archived. Start a new conversation to continue.' }, { status: 409 });
  }

  let content = '';
  try {
    const body = (await request.json()) as { content?: unknown };
    content = typeof body.content === 'string' ? body.content.trim() : '';
  } catch {
    content = '';
  }
  if (!content) return NextResponse.json({ error: 'Please enter a message.' }, { status: 400 });
  if (content.length > 4000) return NextResponse.json({ error: 'Message is too long (max 4000 characters).' }, { status: 400 });

  // Prototype usage limits (per-user daily/monthly).
  const limit = await checkUsageLimit(userId);
  if (!limit.allowed) return NextResponse.json({ error: limit.message }, { status: 429 });

  const agentResult = conv.data.agentId ? await agents.byId(conv.data.agentId) : { ok: false as const };
  const agent = agentResult.ok ? agentResult.data : null;

  // Subscription access: chatting with a specialist requires an active
  // subscription that covers it — enforced here as well as at creation.
  if (agent && agent.kind === 'specialist') {
    const access = await subscriptionsService.memberAccess(userId);
    if (!access.ok || !access.data.includes(agent.slug)) {
      return NextResponse.json({ error: 'Your plan does not include this specialist. Please review your subscription.' }, { status: 403 });
    }
  }

  const history = await conversationsRepo.historyFor(id);
  await conversationsRepo.insertUserMessage(id, content);

  // Per-user concurrency guard: closes the check-then-proceed window on the
  // usage limit above and bounds parallel AI spend. Released when the stream
  // finishes (the response outlives this handler).
  if (!acquireSlot(userId)) {
    return NextResponse.json({ error: 'Please wait for your current reply to finish.' }, { status: 429 });
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
              controller.enqueue(line({ type: 'final', message, escalated: r.escalationRecommended, referral: r.referralSuggestion, citations: r.citations, escalationReason: r.escalationReason }));
            }
          }
        } else {
          // Non-HERNE agent: no streaming provider path — reply then emit as one chunk.
          const reply = agent
            ? await specialistReply(agent, history, content, { userId, conversationId: id })
            : { text: 'Thanks for your message. A member of the team will follow up with you.', citations: [], grounded: false, available: false };
          controller.enqueue(line({ type: 'delta', text: reply.text }));
          const message = await conversationsRepo.insertAssistantMessage(id, { content: reply.text, model: agent?.defaultModelId ?? null });
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
