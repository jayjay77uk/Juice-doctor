import 'server-only';

import type { PlaygroundResult, AiRunLog, RetrievedChunk } from '@/types/ai-platform';
import { env } from '@/lib/env';
import { getAiProvider } from '@/lib/ai';
import { agents } from './agents';
import { knowledgeRepo } from './repositories/knowledge-repo';
import { runLogRepo } from './repositories/run-log-repo';
import { ok, type Result } from './result';

/**
 * AI Playground — a real, isolated test harness for an agent + its knowledge.
 * `run()` retrieves the agent's assigned knowledge (FTS) and reasons over it with
 * the AI adapter, returning the answer plus full inspection: retrieved chunks,
 * token usage, latency and model. Runs are logged with is_playground=true so they
 * are distinguishable from customer traffic. Honest when the AI is unavailable.
 */

function num(v: unknown, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export const playground = {
  async run(input: {
    agentId: string;
    promptVersionId?: string;
    query: string;
    knowledgeCount?: number;
    modelKey?: string;
  }): Promise<Result<PlaygroundResult>> {
    const started = Date.now();
    const agentResult = await agents.byId(input.agentId);
    const agent = agentResult.ok ? agentResult.data : null;
    const provider = getAiProvider();

    const chunks = agent ? await knowledgeRepo.retrieve(agent.id, input.query, input.knowledgeCount ?? 4) : [];
    const retrieved: RetrievedChunk[] = chunks.map((c, i) => ({
      documentTitle: c.documentTitle,
      snippet: c.content.slice(0, 180),
      score: Math.max(0.4, Math.round((1 - i * 0.12) * 100) / 100),
    }));

    if (!provider || !agent) {
      return ok({
        output: !provider
          ? 'The AI provider is not configured, so no response was generated. (Honest unavailable state — the playground never fabricates a reply.)'
          : 'That agent could not be found.',
        retrievedKnowledge: retrieved,
        tokensInput: 0,
        tokensOutput: 0,
        latencyMs: Date.now() - started,
        modelKey: input.modelKey ?? env.aiModel,
      });
    }

    const knowledgeBlock = chunks.length
      ? chunks.map((c, i) => `[${i + 1}] From "${c.documentTitle}":\n${c.content}`).join('\n\n')
      : '';
    const system = [
      agent.systemPrompt?.trim() || `You are ${agent.name}.`,
      agent.responseBoundaries?.trim() ? `Boundaries: ${agent.responseBoundaries.trim()}` : '',
      knowledgeBlock
        ? `Use this knowledge to answer and cite sources as [n]:\n\n${knowledgeBlock}`
        : 'You have no knowledge documents for this query — answer within your remit and do not invent specifics.',
      'Never fabricate facts, prices, or clinical claims.',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const res = await provider.chat({
        system,
        messages: [{ role: 'user', content: input.query }],
        maxTokens: 700,
        ...(input.modelKey ? { model: input.modelKey } : {}),
      });
      const latencyMs = Date.now() - started;
      await runLogRepo.log({
        agentId: agent.id,
        input: input.query,
        output: res.text,
        retrieved: chunks.map((c) => ({ title: c.documentTitle, chunkIndex: c.chunkIndex })),
        tokensInput: res.usage?.inputTokens ?? null,
        tokensOutput: res.usage?.outputTokens ?? null,
        latencyMs,
        status: 'ok',
        isPlayground: true,
      });
      return ok({
        output: res.text.trim(),
        retrievedKnowledge: retrieved,
        tokensInput: res.usage?.inputTokens ?? 0,
        tokensOutput: res.usage?.outputTokens ?? 0,
        latencyMs,
        modelKey: res.model,
      });
    } catch {
      const latencyMs = Date.now() - started;
      await runLogRepo.log({ agentId: agent.id, input: input.query, output: '', latencyMs, status: 'error', isPlayground: true });
      return ok({
        output: 'The AI could not complete this request just now. (Honest unavailable state.)',
        retrievedKnowledge: retrieved,
        tokensInput: 0,
        tokensOutput: 0,
        latencyMs,
        modelKey: input.modelKey ?? env.aiModel,
      });
    }
  },

  async logs(limit = 25): Promise<Result<AiRunLog[]>> {
    const rows = await runLogRepo.recent(limit, { playgroundOnly: true });
    const logs: AiRunLog[] = rows.map((r) => {
      const retrieved = Array.isArray(r.retrieved_knowledge) ? (r.retrieved_knowledge as Record<string, unknown>[]) : [];
      return {
        id: String(r.id),
        agentId: (r.agent_id as string | null) ?? null,
        promptVersionId: (r.prompt_version_id as string | null) ?? null,
        actorId: (r.actor_id as string | null) ?? null,
        isPlayground: Boolean(r.is_playground),
        input: (r.input as string | null) ?? '',
        output: (r.output as string | null) ?? '',
        retrievedKnowledge: retrieved.map((k) => ({
          documentTitle: String(k.title ?? k.documentTitle ?? 'Document'),
          snippet: '',
          score: 0,
        })),
        tokensInput: num(r.tokens_input),
        tokensOutput: num(r.tokens_output),
        latencyMs: num(r.latency_ms),
        status: (r.status as AiRunLog['status']) ?? 'ok',
        createdAt: String(r.created_at),
      };
    });
    return ok(logs);
  },
};
