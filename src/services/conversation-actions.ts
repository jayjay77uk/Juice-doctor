'use server';

import { revalidatePath } from 'next/cache';
import { conversations_service } from './conversations';
import { agents } from './agents';
import { subscriptionsService } from './subscriptions';
import { assertSession } from '@/lib/auth/authorize';
import { track } from '@/lib/monitoring/events';
import { escalationEngine } from './herne/referrals';
import { checkUsageLimit, acquireSlot, releaseSlot } from './ai-usage';
import { hasConsent } from './consents';
import { conversationsRepo } from './repositories/conversations-repo';
import type { Message, FeedbackRating } from '@/types/conversation';

const MSG_RES = 'Please sign in.';
const MSG_OWN = 'Conversation not found.';

/**
 * Customer-facing Server Actions for the specialist-AI chat surface. Each action
 * is authenticated and ownership-checked, and threads persist to the database.
 */

/** Ensure the conversation exists and belongs to the signed-in customer. */
async function assertOwnedConversation(conversationId: string, userId: string): Promise<boolean> {
  const conv = await conversations_service.byId(conversationId);
  return conv.ok && conv.data.userId === userId;
}

export async function sendMessageAction(
  conversationId: string,
  content: string,
): Promise<{ ok: true; messages: Message[] } | { ok: false; error: string }> {
  let userId: string;
  try {
    const session = await assertSession();
    userId = session.user.id;
  } catch {
    return { ok: false, error: MSG_RES };
  }
  const conv = await conversations_service.byId(conversationId);
  if (!conv.ok || conv.data.userId !== userId || conv.data.status === 'deleted') return { ok: false, error: MSG_OWN };
  if (conv.data.status !== 'active') return { ok: false, error: 'This conversation is archived.' };
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 4000) return { ok: false, error: 'Enter a message of 1–4000 characters.' };
  if (conv.data.context?.human_takeover === true) {
    await conversationsRepo.insertUserMessage(conversationId, content.trim());
    const stored = await conversations_service.messages(conversationId);
    return stored.ok ? { ok: true, messages: stored.data } : { ok: false, error: 'Your message was saved but the conversation could not be refreshed.' };
  }
  if (!(await hasConsent(userId, 'ai_processing'))) return { ok: false, error: 'Review AI processing consent in Settings before chatting.' };
  const found = conv.data.agentId ? await agents.byId(conv.data.agentId) : null;
  if (!found?.ok || found.data.status !== 'active') return { ok: false, error: 'This specialist is currently unavailable.' };
  if (found.data.kind === 'specialist') {
    const access = await subscriptionsService.memberAccess(userId);
    if (!access.ok) return { ok: false, error: 'We could not check your subscription. Please try again shortly.' };
    if (!access.data.includes(found.data.slug)) return { ok: false, error: 'Your plan does not include this specialist.' };
  }
  if (!acquireSlot(userId)) return { ok: false, error: 'Please wait for your current reply to finish.' };
  try {
    const limit = await checkUsageLimit(userId);
    if (!limit.allowed) return { ok: false, error: limit.message };
    const result = await conversations_service.send(conversationId, content.trim());
    if (!result.ok) return { ok: false, error: result.error.message };
    return { ok: true, messages: result.data };
  } finally {
    releaseSlot(userId);
  }
}

export async function requestSupportAction(
  conversationId: string,
): Promise<{ ok: true; messages: Message[] } | { ok: false; error: string }> {
  let userId: string;
  try {
    const session = await assertSession();
    userId = session.user.id;
  } catch {
    return { ok: false, error: MSG_RES };
  }
  if (!(await assertOwnedConversation(conversationId, userId))) return { ok: false, error: MSG_OWN };

  // Create a REAL staff-visible escalation before telling the member anything.
  // escalationEngine writes herne_escalations + a member timeline event, bridges
  // into the CRM human-review queue and sends the staff alert — the same path a
  // specialist escalation takes. Without this the member was told the team had
  // been notified when nothing had been recorded anywhere.
  let specialist: string | undefined;
  const convo = await conversations_service.byId(conversationId);
  if (convo.ok && convo.data.agentId) {
    const agent = await agents.byId(convo.data.agentId);
    if (agent.ok) specialist = agent.data.slug;
  }
  let notified = false;
  try {
    const escalation = await escalationEngine.escalate({
      userId,
      conversationId,
      trigger: 'human_review',
      reason: 'The member asked to speak with a person from their conversation.',
      ...(specialist ? { specialist } : {}),
      destination: 'Human support',
    });
    notified = Boolean(escalation.escalationId);
  } catch {
    notified = false;
  }
  if (!notified) return { ok: false, error: 'The support request could not be recorded. Please try again.' };

  const result = await conversations_service.requestSupport(conversationId, { notified });
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, messages: result.data };
}

export async function messageFeedbackAction(
  messageId: string,
  rating: FeedbackRating,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let userId: string;
  try {
    const session = await assertSession();
    userId = session.user.id;
  } catch {
    return { ok: false, error: MSG_RES };
  }
  const result = await conversations_service.feedback(messageId, rating, userId);
  return result.ok ? { ok: true } : { ok: false, error: result.error.message };
}

export async function startConversationAction(
  agentId: string,
): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  let userId: string;
  try {
    const session = await assertSession();
    userId = session.user.id;
  } catch {
    return { ok: false, error: MSG_RES };
  }
  // Subscription access: a specialist chat requires an active subscription
  // covering that specialist (mirrored in the streaming message route).
  const byId = await agents.byId(agentId);
  const bySlug = byId.ok ? null : await agents.bySlug(agentId.replace(/^agent_/, ''));
  const agent = byId.ok ? byId.data : bySlug?.ok ? bySlug.data : null;
  if (agent && agent.kind === 'specialist') {
    const access = await subscriptionsService.memberAccess(userId);
    if (!access.ok || !access.data.includes(agent.slug)) {
      return { ok: false, error: 'Your plan does not include this specialist yet. Please review your subscription.' };
    }
  }
  const result = await conversations_service.create({ agentId, userId });
  if (!result.ok) return { ok: false, error: result.error.message };
  await track('conversation.started', { specialistSlug: agent?.slug ?? 'unknown' }, userId);
  return { ok: true, conversationId: result.data.id };
}

export async function renameConversationAction(
  conversationId: string,
  title: string,
): Promise<{ ok: true; title: string } | { ok: false; error: string }> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return { ok: false, error: MSG_RES };
  }
  if (!(await assertOwnedConversation(conversationId, userId))) return { ok: false, error: MSG_OWN };
  const result = await conversations_service.rename(conversationId, title);
  if (!result.ok) return { ok: false, error: result.error.message };
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath('/dashboard/conversations');
  return { ok: true, title: result.data.title };
}

export async function archiveConversationAction(
  conversationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let userId: string;
  try {
    userId = (await assertSession()).user.id;
  } catch {
    return { ok: false, error: MSG_RES };
  }
  if (!(await assertOwnedConversation(conversationId, userId))) return { ok: false, error: MSG_OWN };
  const result = await conversations_service.archive(conversationId);
  if (!result.ok) return { ok: false, error: result.error.message };
  revalidatePath('/dashboard/conversations');
  return { ok: true };
}
