/**
 * Conversation model — mirrors migration 0010. Structure only; no AI runtime.
 */

export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
export type FeedbackRating = 'up' | 'down';

export interface Conversation {
  id: string;
  organisationId: string;
  userId: string;
  agentId: string | null;
  title: string;
  status: ConversationStatus;
  context: Record<string, unknown>;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenCount: number | null;
  toolCalls: Record<string, unknown>[] | null;
  toolCallId: string | null;
  modelKey: string | null;
  createdAt: string;
}

export interface MessageFeedback {
  id: string;
  messageId: string;
  userId: string;
  rating: FeedbackRating;
  comment: string | null;
  createdAt: string;
}
