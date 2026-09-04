import 'server-only';

import type { Conversation, Message, ConversationStatus, FeedbackRating, MessageFeedback } from '@/types/conversation';
import { ok, type Result } from './result';
import { conversationsRepo } from './repositories/conversations-repo';
import { memoryRepo } from './repositories/memory-repo';

/**
 * Conversation service — the specialist-AI chat surface. PRODUCTION only:
 * conversations + messages tables via the repository (replies stream through the
 * live HERNE assembler; every turn persists citations, evidence, tokens, cost and
 * safety state). No mock data; without a database the repository returns honest
 * unavailable results and the pages render their empty states.
 */

export const conversations_service = {
  list(userId: string, opts?: { status?: ConversationStatus; search?: string }): Promise<Result<Conversation[]>> {
    return conversationsRepo.list(userId, opts);
  },
  byId(id: string): Promise<Result<Conversation>> {
    return conversationsRepo.byId(id);
  },
  messages(conversationId: string): Promise<Result<Message[]>> {
    return conversationsRepo.messages(conversationId);
  },
  create(input: { userId: string; agentId: string; title?: string }): Promise<Result<Conversation>> {
    return conversationsRepo.create({
      userId: input.userId,
      agentId: input.agentId,
      ...(input.title ? { title: input.title } : {}),
    });
  },
  send(conversationId: string, content: string): Promise<Result<Message[]>> {
    return conversationsRepo.send(conversationId, content);
  },
  setStatus(id: string, status: ConversationStatus): Promise<Result<Conversation>> {
    return conversationsRepo.setStatus(id, status);
  },
  rename(id: string, title: string): Promise<Result<Conversation>> {
    return conversationsRepo.rename(id, title);
  },
  archive(id: string): Promise<Result<Conversation>> {
    return conversationsRepo.setStatus(id, 'archived');
  },
  remove(id: string): Promise<Result<Conversation>> {
    return conversationsRepo.setStatus(id, 'deleted');
  },
  requestSupport(conversationId: string, opts?: { notified?: boolean }): Promise<Result<Message[]>> {
    return conversationsRepo.requestSupport(conversationId, opts);
  },
  feedback(messageId: string, rating: FeedbackRating, userId: string): Promise<Result<MessageFeedback | { id: string }>> {
    return conversationsRepo.feedback(messageId, userId, rating);
  },
  /** Durable things the platform remembers for this person (their own memory). */
  async remembered(userId: string): Promise<Result<string[]>> {
    const items = await memoryRepo.recall({ userId, limit: 8 });
    return ok(items.map((i) => i.content));
  },
};
