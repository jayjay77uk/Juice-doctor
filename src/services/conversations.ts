import 'server-only';

import type { Conversation, Message, MessageFeedback, FeedbackRating, ConversationStatus } from '@/types/conversation';
import type { AiAgent } from '@/types/ai';
import type { ChatMessage } from '@/lib/ai';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { agents } from './agents';
import { specialistReply } from './specialist-reply';
import { conversationsRepo } from './repositories/conversations-repo';
import { memoryRepo } from './repositories/memory-repo';
import { ok, err, type Result } from './result';

/**
 * Conversation service — the specialist-AI chat surface for subscribed
 * customers. PROTOTYPE: replies are a deterministic MOCK grounded in the
 * specialist's assigned knowledge brain (it cites an indexed document); no live
 * AI runs. A small in-process "remembered" store demonstrates that preferences
 * are carried across the conversation. Production swaps `send()` for live
 * inference + retrieval over the knowledge_* tables — the interface is unchanged.
 */

const ORG = '00000000-0000-0000-0000-000000000001';
const MEMBER = 'usr_member';
const TS = '2026-07-10T00:00:00.000Z';
let cCounter = 0;
let mCounter = 0;
let fCounter = 0;

function nowIso(): string {
  return new Date().toISOString();
}

const conversations: Conversation[] = [
  { id: 'conv_1', organisationId: ORG, userId: MEMBER, agentId: 'agent_specialist-ai-1', title: 'Getting started', status: 'active', context: {}, lastMessageAt: '2026-07-09T10:00:00.000Z', createdAt: '2026-07-08T09:00:00.000Z' },
  { id: 'conv_2', organisationId: ORG, userId: MEMBER, agentId: 'agent_specialist-ai-2', title: 'A few questions', status: 'active', context: {}, lastMessageAt: '2026-07-07T14:00:00.000Z', createdAt: '2026-07-07T13:30:00.000Z' },
];

const messages: Message[] = [
  { id: 'msg_1', conversationId: 'conv_1', role: 'assistant', content: 'Hello — I am Specialist AI 1. How can I help you today?', tokenCount: null, toolCalls: null, toolCallId: null, modelKey: null, createdAt: '2026-07-08T09:00:00.000Z' },
  { id: 'msg_2', conversationId: 'conv_1', role: 'user', content: 'I would like to understand how to get started.', tokenCount: null, toolCalls: null, toolCallId: null, modelKey: null, createdAt: '2026-07-08T09:01:00.000Z' },
  { id: 'msg_3', conversationId: 'conv_1', role: 'assistant', content: 'Here is a placeholder answer. In the full platform I would draw on my knowledge base to help you get started. (Prototype: no live AI is connected.)', tokenCount: null, toolCalls: null, toolCallId: null, modelKey: null, createdAt: '2026-07-09T10:00:00.000Z' },
  { id: 'msg_4', conversationId: 'conv_2', role: 'assistant', content: 'Hello — I am Specialist AI 2. How can I help you today?', tokenCount: null, toolCalls: null, toolCallId: null, modelKey: null, createdAt: '2026-07-07T13:30:00.000Z' },
];

const feedback: MessageFeedback[] = [];

/** Simple per-user remembered preferences (mock memory). */
const remembered: Record<string, string[]> = { [MEMBER]: ['Prefers clear, step-by-step answers.'] };

function findConversation(id: string): Conversation | undefined {
  return conversations.find((c) => c.id === id);
}

/** Resolve a conversation's agent by real DB id, or by slug for legacy `agent_<slug>` ids. */
async function resolveAgent(agentId: string | null): Promise<AiAgent | null> {
  if (!agentId) return null;
  const byId = await agents.byId(agentId);
  if (byId.ok) return byId.data;
  const bySlug = await agents.bySlug(agentId.replace(/^agent_/, ''));
  return bySlug.ok ? bySlug.data : null;
}

const mockConversations = {
  async list(userId = MEMBER): Promise<Result<Conversation[]>> {
    return ok(
      conversations
        .filter((c) => c.userId === userId && c.status !== 'deleted')
        .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt)),
    );
  },

  async byId(id: string): Promise<Result<Conversation>> {
    const match = findConversation(id);
    return match ? ok(match) : err({ code: 'not_found', message: 'Conversation not found.' });
  },

  async messages(conversationId: string): Promise<Result<Message[]>> {
    return ok(messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  },

  async remembered(userId = MEMBER): Promise<Result<string[]>> {
    return ok(remembered[userId] ?? []);
  },

  /** Start a new conversation with a specialist AI, seeded with its welcome message. */
  async create(input: { userId?: string; agentId: string; title?: string }): Promise<Result<Conversation>> {
    const agentResult = await agents.byId(input.agentId);
    if (!agentResult.ok) return err({ code: 'not_found', message: 'Specialist not found.' });
    const id = `conv_new_${++cCounter}`;
    const conversation: Conversation = {
      id,
      organisationId: ORG,
      userId: input.userId ?? MEMBER,
      agentId: input.agentId,
      title: input.title?.trim() || 'New conversation',
      status: 'active',
      context: {},
      lastMessageAt: nowIso(),
      createdAt: nowIso(),
    };
    conversations.unshift(conversation);
    messages.push({
      id: `msg_new_${++mCounter}`,
      conversationId: id,
      role: 'assistant',
      content: agentResult.data.welcomeMessage,
      tokenCount: null,
      toolCalls: null,
      toolCallId: null,
      modelKey: null,
      createdAt: nowIso(),
    });
    return ok(conversation);
  },

  /** Send a user message and get the specialist's (mock, knowledge-grounded) reply. */
  async send(conversationId: string, content: string): Promise<Result<Message[]>> {
    const conversation = findConversation(conversationId);
    if (!conversation) return err({ code: 'not_found', message: 'Conversation not found.' });
    if (!content.trim()) return err({ code: 'invalid', message: 'Please enter a message.' });

    messages.push({ id: `msg_new_${++mCounter}`, conversationId, role: 'user', content: content.trim(), tokenCount: null, toolCalls: null, toolCallId: null, modelKey: null, createdAt: nowIso() });

    // Remember a simple preference signal (mock memory).
    if (/prefer|like|rather/i.test(content)) {
      const list = remembered[conversation.userId] ?? (remembered[conversation.userId] = []);
      const note = `Mentioned a preference: “${content.trim().slice(0, 60)}”.`;
      if (!list.includes(note)) list.push(note);
    }

    // Real specialist reply: retrieve assigned knowledge + reason over it.
    const agent = await resolveAgent(conversation.agentId);
    let replyText: string;
    let modelKey: string | null = null;
    if (!agent) {
      replyText = 'Thanks for your message. A member of the team will follow up with you.';
    } else {
      const history: ChatMessage[] = messages
        .filter((m) => m.conversationId === conversationId && (m.role === 'user' || m.role === 'assistant'))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, -1) // exclude the user message just pushed (passed separately)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const reply = await specialistReply(agent, history, content.trim(), { userId: conversation.userId, conversationId });
      replyText = reply.citations.length ? `${reply.text}\n\nSources: ${reply.citations.join(', ')}` : reply.text;
      modelKey = agent.defaultModelId;
    }
    messages.push({ id: `msg_new_${++mCounter}`, conversationId, role: 'assistant', content: replyText, tokenCount: null, toolCalls: null, toolCallId: null, modelKey, createdAt: nowIso() });

    conversation.lastMessageAt = nowIso();
    return mockConversations.messages(conversationId);
  },

  async feedback(messageId: string, rating: FeedbackRating, userId = MEMBER): Promise<Result<MessageFeedback>> {
    const record: MessageFeedback = { id: `fb_${++fCounter}`, messageId, userId, rating, comment: null, createdAt: nowIso() };
    feedback.push(record);
    return ok(record);
  },

  /** Customer asks to speak with a person — logged in the thread. */
  async requestSupport(conversationId: string): Promise<Result<Message[]>> {
    const conversation = findConversation(conversationId);
    if (!conversation) return err({ code: 'not_found', message: 'Conversation not found.' });
    messages.push({
      id: `msg_new_${++mCounter}`,
      conversationId,
      role: 'system',
      content: 'You asked to speak with a person. A member of the team has been notified and will follow up. (Prototype: no message is actually sent.)',
      tokenCount: null,
      toolCalls: null,
      toolCallId: null,
      modelKey: null,
      createdAt: nowIso(),
    });
    conversation.lastMessageAt = nowIso();
    return mockConversations.messages(conversationId);
  },

  async setStatus(id: string, status: ConversationStatus): Promise<Result<Conversation>> {
    const conversation = findConversation(id);
    if (!conversation) return err({ code: 'not_found', message: 'Conversation not found.' });
    conversation.status = status;
    return ok(conversation);
  },

  async rename(id: string, title: string): Promise<Result<Conversation>> {
    const conversation = findConversation(id);
    if (!conversation) return err({ code: 'not_found', message: 'Conversation not found.' });
    if (!title.trim()) return err({ code: 'invalid', message: 'Please enter a title.' });
    conversation.title = title.trim().slice(0, 120);
    return ok(conversation);
  },
};

const dbConv = (): boolean => isSupabaseAdminConfigured();

/**
 * Public conversation API. Persists to the conversations + messages tables on the
 * deployed platform; uses the in-process mock store for local dev. Same interface.
 */
export const conversations_service = {
  list(userId = MEMBER, opts?: { status?: ConversationStatus; search?: string }): Promise<Result<Conversation[]>> {
    return dbConv() ? conversationsRepo.list(userId, opts) : mockConversations.list(userId);
  },
  byId(id: string): Promise<Result<Conversation>> {
    return dbConv() ? conversationsRepo.byId(id) : mockConversations.byId(id);
  },
  messages(conversationId: string): Promise<Result<Message[]>> {
    return dbConv() ? conversationsRepo.messages(conversationId) : mockConversations.messages(conversationId);
  },
  create(input: { userId?: string; agentId: string; title?: string }): Promise<Result<Conversation>> {
    if (dbConv()) {
      return conversationsRepo.create({
        userId: input.userId ?? MEMBER,
        agentId: input.agentId,
        ...(input.title ? { title: input.title } : {}),
      });
    }
    return mockConversations.create(input);
  },
  send(conversationId: string, content: string): Promise<Result<Message[]>> {
    return dbConv() ? conversationsRepo.send(conversationId, content) : mockConversations.send(conversationId, content);
  },
  setStatus(id: string, status: ConversationStatus): Promise<Result<Conversation>> {
    return dbConv() ? conversationsRepo.setStatus(id, status) : mockConversations.setStatus(id, status);
  },
  rename(id: string, title: string): Promise<Result<Conversation>> {
    return dbConv() ? conversationsRepo.rename(id, title) : mockConversations.rename(id, title);
  },
  archive(id: string): Promise<Result<Conversation>> {
    return conversations_service.setStatus(id, 'archived');
  },
  remove(id: string): Promise<Result<Conversation>> {
    return conversations_service.setStatus(id, 'deleted');
  },
  requestSupport(conversationId: string): Promise<Result<Message[]>> {
    return dbConv() ? conversationsRepo.requestSupport(conversationId) : mockConversations.requestSupport(conversationId);
  },
  async feedback(messageId: string, rating: FeedbackRating, userId = MEMBER): Promise<Result<{ id: string }>> {
    if (dbConv()) return conversationsRepo.feedback(messageId, userId, rating);
    const r = await mockConversations.feedback(messageId, rating, userId);
    return r.ok ? ok({ id: r.data.id }) : r;
  },
  async remembered(userId = MEMBER): Promise<Result<string[]>> {
    if (dbConv()) {
      const items = await memoryRepo.recall({ userId, limit: 8 });
      return ok(items.map((i) => i.content));
    }
    return mockConversations.remembered(userId);
  },
};
