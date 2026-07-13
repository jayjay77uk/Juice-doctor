import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { ChatMessage } from '@/lib/ai';
import { getAiProvider } from '@/lib/ai';
import { knowledgeRepo } from './repositories/knowledge-repo';
import { runLogRepo } from './repositories/run-log-repo';
import { memoryRepo, extractMemory, type MemoryItem } from './repositories/memory-repo';
import { herneSpecialistReply, isHerneSpecialist } from './herne/reply';
import { languageDirective, HERNE_DEFAULT_PREFERENCE, type LanguagePreference } from './herne/language';
import { getLanguagePreferenceFor } from './herne/language-store';
import { isMemoryEnabled } from './memory-prefs';

/**
 * The real specialist-AI turn: retrieve the specialist's assigned knowledge
 * (FTS), reason over it with the provider-neutral adapter grounded in that
 * knowledge, cite sources, and log the run. NEVER fabricates: with no AI provider
 * it returns an honest unavailable message; with no relevant knowledge it answers
 * from its configured remit and declines to invent specifics.
 */

export interface SpecialistReply {
  text: string;
  citations: string[];
  grounded: boolean;
  available: boolean;
}

function buildSystemPrompt(agent: AiAgent, knowledgeBlock: string, memory: MemoryItem[], langDirective: string | null): string {
  const memoryBlock = memory.length
    ? `What you remember about this customer (respect it):\n${memory.map((m) => `- (${m.kind}) ${m.content}`).join('\n')}`
    : '';
  return [
    agent.systemPrompt?.trim() || `You are ${agent.name}, a specialist assistant.`,
    agent.personality?.trim() ? `Personality: ${agent.personality.trim()}` : '',
    agent.responseBoundaries?.trim() ? `Boundaries: ${agent.responseBoundaries.trim()}` : '',
    memoryBlock,
    'Answer the customer helpfully, warmly and concisely.',
    knowledgeBlock
      ? `Use the following knowledge to answer factual questions. If the answer is not contained in it, say you do not have that information and offer to connect them with the team. Cite sources inline as [n].\n\nKNOWLEDGE:\n${knowledgeBlock}`
      : 'You currently have no knowledge documents for this question. Answer within your general remit, and do NOT invent specific facts, figures, prices, or clinical claims — offer to connect the customer with the team for specifics.',
    langDirective,
    'Never fabricate facts, prices, or medical/clinical claims. Do not give medical, legal or financial advice.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function specialistReply(
  agent: AiAgent,
  history: ChatMessage[],
  userText: string,
  ctx?: { userId?: string | null; conversationId?: string | null; language?: LanguagePreference },
): Promise<SpecialistReply> {
  // HERNE specialists answer through the shared-evidence, DNA-assembled reply.
  if (isHerneSpecialist(agent.slug)) {
    const h = await herneSpecialistReply(agent, history, userText, ctx);
    const text = h.escalationRecommended && h.escalationReason ? `${h.text}\n\n⚠ ${h.escalationReason}` : h.text;
    const citations = [...new Set(h.citations.map((c) => (c.sourceTitle ? `${c.recordId} — ${c.sourceTitle}` : c.recordId)))];
    return { text, citations, grounded: h.grounded, available: h.available };
  }

  const provider = getAiProvider();
  if (!provider) {
    return {
      text: `I'm sorry — ${agent.name} is temporarily unavailable. Please try again shortly, or I can connect you with a member of the team.`,
      citations: [],
      grounded: false,
      available: false,
    };
  }

  const started = Date.now();
  const [chunks, memory, pref] = await Promise.all([
    knowledgeRepo.retrieve(agent.id, userText, 4),
    ctx ? memoryRepo.recall({ userId: ctx.userId ?? null, conversationId: ctx.conversationId ?? null, limit: 6 }) : Promise.resolve([] as MemoryItem[]),
    ctx?.language ? Promise.resolve(ctx.language) : ctx?.userId ? getLanguagePreferenceFor(ctx.userId) : Promise.resolve<LanguagePreference>(HERNE_DEFAULT_PREFERENCE),
  ]);
  const knowledgeBlock = chunks.length
    ? chunks.map((c, i) => `[${i + 1}] From "${c.documentTitle}":\n${c.content}`).join('\n\n')
    : '';

  try {
    const messages: ChatMessage[] = [...history.slice(-8), { role: 'user', content: userText }];
    const res = await provider.chat({
      system: buildSystemPrompt(agent, knowledgeBlock, memory, languageDirective(pref)),
      messages,
      maxTokens: 700,
      op: 'specialist:reply',
    });
    const citations = [...new Set(chunks.map((c) => c.documentTitle))];
    await runLogRepo.log({
      agentId: agent.id,
      actorId: ctx?.userId ?? null,
      input: userText,
      output: res.text,
      retrieved: chunks.map((c) => ({ title: c.documentTitle, chunkIndex: c.chunkIndex })),
      tokensInput: res.usage?.inputTokens ?? null,
      tokensOutput: res.usage?.outputTokens ?? null,
      latencyMs: Date.now() - started,
      status: 'ok',
      model: res.model,
      costUsd: res.costUsd,
      traceId: res.traceId,
    });
    // Extract + persist a durable preference/fact the customer stated (consent-gated).
    if (ctx?.userId && (await isMemoryEnabled(ctx.userId))) {
      const mem = extractMemory(userText);
      if (mem) {
        await memoryRepo.remember({
          scope: 'user',
          kind: mem.kind,
          key: `user:${mem.content.slice(0, 40)}`,
          content: mem.content,
          userId: ctx.userId,
          agentId: agent.id,
          importance: 3,
          source: 'chat',
        });
      }
    }
    return { text: res.text.trim(), citations, grounded: chunks.length > 0, available: true };
  } catch {
    await runLogRepo.log({
      agentId: agent.id,
      actorId: ctx?.userId ?? null,
      input: userText,
      output: '',
      latencyMs: Date.now() - started,
      status: 'error',
    });
    return {
      text: `I'm sorry — I couldn't complete that just now. Please try again, or I can pass you to a member of the team.`,
      citations: [],
      grounded: false,
      available: true,
    };
  }
}
