'use server';

import { revalidatePath } from 'next/cache';
import { conversations_service } from './conversations';
import { assertSession } from '@/lib/auth/authorize';
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
  if (!(await assertOwnedConversation(conversationId, userId))) return { ok: false, error: MSG_OWN };
  const result = await conversations_service.send(conversationId, content);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, messages: result.data };
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
  const result = await conversations_service.requestSupport(conversationId);
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
  const result = await conversations_service.create({ agentId, userId });
  if (!result.ok) return { ok: false, error: result.error.message };
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
