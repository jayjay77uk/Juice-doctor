'use server';

import { conversations_service } from './conversations';
import type { Message, FeedbackRating } from '@/types/conversation';

/**
 * Customer-facing Server Actions for the specialist-AI chat surface. Prototype:
 * replies are a knowledge-grounded mock via the conversation service; production
 * swaps the reply body for live inference. Signatures are stable.
 */

export async function sendMessageAction(
  conversationId: string,
  content: string,
): Promise<{ ok: true; messages: Message[] } | { ok: false; error: string }> {
  const result = await conversations_service.send(conversationId, content);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, messages: result.data };
}

export async function requestSupportAction(
  conversationId: string,
): Promise<{ ok: true; messages: Message[] } | { ok: false; error: string }> {
  const result = await conversations_service.requestSupport(conversationId);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, messages: result.data };
}

export async function messageFeedbackAction(
  messageId: string,
  rating: FeedbackRating,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await conversations_service.feedback(messageId, rating);
  return result.ok ? { ok: true } : { ok: false, error: result.error.message };
}

export async function startConversationAction(
  agentId: string,
): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const result = await conversations_service.create({ agentId });
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, conversationId: result.data.id };
}
