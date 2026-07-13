import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Conversation, Message, ConversationStatus, MessageRole, FeedbackRating } from '@/types/conversation';
import type { ChatMessage } from '@/lib/ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { agents } from '../agents';
import { specialistReply } from '../specialist-reply';
import { ok, err, type Result } from '../result';

/**
 * Persistent conversation repository over the conversations + messages tables.
 * Threads, messages, status (active/archived/deleted), search and feedback are
 * real DB rows. `send()` persists the customer turn, runs the real grounded
 * specialist reply, and persists the answer.
 */

const ORG = '00000000-0000-0000-0000-000000000001';
type Row = Record<string, unknown>;

export interface AssistantTurn {
  content: string;
  specialist?: string | null;
  language?: string | null;
  citations?: { recordId: string; sourceTitle: string; sourceUrl: string }[];
  escalated?: boolean;
  referral?: { toRole: string; reason: string; urgency: string } | null;
  safetyState?: string | null;
  model?: string | null;
  tokensOutput?: number | null;
  latencyMs?: number | null;
  costUsd?: number | null;
  traceId?: string | null;
  promptVersionId?: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function rowToConversation(r: Row): Conversation {
  return {
    id: String(r.id),
    organisationId: String(r.organisation_id),
    userId: String(r.user_id),
    agentId: (r.agent_id as string | null) ?? null,
    title: (r.title as string | null) ?? 'Conversation',
    status: (r.status as ConversationStatus) ?? 'active',
    context: (r.context as Record<string, unknown>) ?? {},
    lastMessageAt: (r.last_message_at as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

function rowToMessage(r: Row): Message {
  return {
    id: String(r.id),
    conversationId: String(r.conversation_id),
    role: (r.role as MessageRole) ?? 'assistant',
    content: String(r.content),
    tokenCount: (r.token_count as number | null) ?? null,
    toolCalls: (r.tool_calls as unknown) ?? null,
    toolCallId: (r.tool_call_id as string | null) ?? null,
    modelKey: (r.model_key as string | null) ?? null,
    createdAt: String(r.created_at),
    specialist: (r.specialist as string | null) ?? null,
    language: (r.language as string | null) ?? null,
    citations: Array.isArray(r.citations) ? (r.citations as Message['citations']) : [],
    escalated: Boolean(r.escalated),
    referral: (r.referral as Message['referral']) ?? null,
    safetyState: (r.safety_state as string | null) ?? null,
  } as Message;
}

async function resolveAgent(agentId: string | null) {
  if (!agentId) return null;
  const byId = await agents.byId(agentId);
  if (byId.ok) return byId.data;
  const bySlug = await agents.bySlug(agentId.replace(/^agent_/, ''));
  return bySlug.ok ? bySlug.data : null;
}

export const conversationsRepo = {
  async list(userId: string, opts?: { status?: ConversationStatus; search?: string }): Promise<Result<Conversation[]>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Conversation store unavailable.' });
    let query = sb.from('conversations').select('*').eq('user_id', userId).order('last_message_at', { ascending: false, nullsFirst: false });
    query = opts?.status ? query.eq('status', opts.status) : query.neq('status', 'deleted');
    if (opts?.search?.trim()) query = query.ilike('title', `%${opts.search.trim()}%`);
    const { data, error } = await query;
    if (error) return err({ code: 'unavailable', message: error.message });
    return ok((data ?? []).map(rowToConversation));
  },

  async byId(id: string): Promise<Result<Conversation>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Conversation store unavailable.' });
    const { data } = await sb.from('conversations').select('*').eq('id', id).maybeSingle();
    return data ? ok(rowToConversation(data)) : err({ code: 'not_found', message: 'Conversation not found.' });
  },

  async messages(conversationId: string): Promise<Result<Message[]>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Conversation store unavailable.' });
    const { data, error } = await sb.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    if (error) return err({ code: 'unavailable', message: error.message });
    return ok((data ?? []).map(rowToMessage));
  },

  async create(input: { userId: string; agentId: string; title?: string }): Promise<Result<Conversation>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Conversation store unavailable.' });
    const agent = await resolveAgent(input.agentId);
    const agentId = agent?.id ?? null;
    const { data, error } = await sb
      .from('conversations')
      .insert({
        organisation_id: ORG,
        user_id: input.userId,
        agent_id: agentId,
        title: input.title?.trim() || (agent ? `Chat with ${agent.name}` : 'New conversation'),
        status: 'active',
        context: {},
        last_message_at: nowIso(),
      })
      .select('*')
      .single();
    if (error || !data) return err({ code: 'unavailable', message: error?.message ?? 'Could not start the conversation.' });
    const conversation = rowToConversation(data);
    if (agent) {
      await sb.from('messages').insert({ conversation_id: conversation.id, role: 'assistant', content: agent.welcomeMessage });
    }
    return ok(conversation);
  },

  async send(conversationId: string, content: string): Promise<Result<Message[]>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Conversation store unavailable.' });
    const conv = await conversationsRepo.byId(conversationId);
    if (!conv.ok) return conv;
    if (!content.trim()) return err({ code: 'invalid', message: 'Please enter a message.' });

    await sb.from('messages').insert({ conversation_id: conversationId, role: 'user', content: content.trim() });

    const agent = await resolveAgent(conv.data.agentId);
    let replyText: string;
    let modelKey: string | null = null;
    if (!agent) {
      replyText = 'Thanks for your message. A member of the team will follow up with you.';
    } else {
      const prior = await conversationsRepo.messages(conversationId);
      const history: ChatMessage[] = (prior.ok ? prior.data : [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(0, -1)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const reply = await specialistReply(agent, history, content.trim(), { userId: conv.data.userId, conversationId });
      replyText = reply.citations.length ? `${reply.text}\n\nSources: ${reply.citations.join(', ')}` : reply.text;
      modelKey = agent.defaultModelId;
    }
    await sb.from('messages').insert({ conversation_id: conversationId, role: 'assistant', content: replyText, model_key: modelKey });
    await sb.from('conversations').update({ last_message_at: nowIso(), updated_at: nowIso() }).eq('id', conversationId);
    return conversationsRepo.messages(conversationId);
  },

  /** Update a conversation's title (rename). */
  async rename(id: string, title: string): Promise<Result<Conversation>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Conversation store unavailable.' });
    const clean = title.trim().slice(0, 120);
    if (!clean) return err({ code: 'invalid', message: 'Please enter a title.' });
    const { data, error } = await sb.from('conversations').update({ title: clean, updated_at: nowIso() }).eq('id', id).select('*').maybeSingle();
    if (error) return err({ code: 'unavailable', message: error.message });
    return data ? ok(rowToConversation(data)) : err({ code: 'not_found', message: 'Conversation not found.' });
  },

  /** Chat history (user/assistant only) for building the model context. */
  async historyFor(conversationId: string): Promise<ChatMessage[]> {
    const prior = await conversationsRepo.messages(conversationId);
    return (prior.ok ? prior.data : [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  },

  /** Insert a user turn. */
  async insertUserMessage(conversationId: string, content: string): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    await sb.from('messages').insert({ conversation_id: conversationId, role: 'user', content: content.trim() });
  },

  /** Insert an assistant turn with its rich HERNE metadata; returns the persisted message. */
  async insertAssistantMessage(conversationId: string, m: AssistantTurn): Promise<Message | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data } = await sb
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: m.content,
        model_key: m.model ?? null,
        token_count: m.tokensOutput ?? null,
        specialist: m.specialist ?? null,
        language: m.language ?? null,
        citations: m.citations ?? [],
        escalated: m.escalated ?? false,
        referral: m.referral ?? null,
        safety_state: m.safetyState ?? null,
        latency_ms: m.latencyMs ?? null,
        cost_micros: m.costUsd != null ? Math.round(m.costUsd * 1_000_000) : null,
        trace_id: m.traceId ?? null,
        ...(m.promptVersionId ? { prompt_version_id: m.promptVersionId } : {}),
      })
      .select('*')
      .maybeSingle();
    await sb.from('conversations').update({ last_message_at: nowIso(), updated_at: nowIso() }).eq('id', conversationId);
    return data ? rowToMessage(data) : null;
  },

  /** Insert a plain system notice (e.g. a specialist handoff). */
  async insertSystemMessage(conversationId: string, content: string): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    await sb.from('messages').insert({ conversation_id: conversationId, role: 'system', content });
    await sb.from('conversations').update({ last_message_at: nowIso(), updated_at: nowIso() }).eq('id', conversationId);
  },

  async setStatus(id: string, status: ConversationStatus): Promise<Result<Conversation>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Conversation store unavailable.' });
    const { data, error } = await sb.from('conversations').update({ status, updated_at: nowIso() }).eq('id', id).select('*').maybeSingle();
    if (error) return err({ code: 'unavailable', message: error.message });
    return data ? ok(rowToConversation(data)) : err({ code: 'not_found', message: 'Conversation not found.' });
  },

  async requestSupport(conversationId: string): Promise<Result<Message[]>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Conversation store unavailable.' });
    const conv = await conversationsRepo.byId(conversationId);
    if (!conv.ok) return conv;
    await sb.from('messages').insert({
      conversation_id: conversationId,
      role: 'system',
      content: 'You asked to speak with a person. A member of the team has been notified and will follow up.',
    });
    await sb.from('conversations').update({ last_message_at: nowIso(), updated_at: nowIso() }).eq('id', conversationId);
    return conversationsRepo.messages(conversationId);
  },

  async feedback(messageId: string, userId: string, rating: FeedbackRating): Promise<Result<{ id: string }>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Conversation store unavailable.' });
    const { data, error } = await sb
      .from('message_feedback')
      .insert({ message_id: messageId, user_id: userId, rating })
      .select('id')
      .single();
    if (error || !data) return err({ code: 'unavailable', message: error?.message ?? 'Could not record feedback.' });
    return ok({ id: String(data.id) });
  },
};
