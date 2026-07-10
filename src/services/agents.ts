import 'server-only';

import type { AiAgent, AiAgentDefinition } from '@/types/ai';
import { DEFAULT_AI_AGENTS } from '@/config/ai-agents';
import { ok, err, type Result } from './result';

/**
 * AI agent service — the framework read/registry layer (NO inference).
 *
 * Prototype: agents come from the code registry (src/config/ai-agents.ts).
 * Production: this service reads the `ai_agents` table; because agents are data,
 * the client creates/edits them from the admin UI with no code change. The
 * interface is identical for both providers.
 */

const SEED_TS = '2026-07-10T00:00:00.000Z';

function toAgent(def: AiAgentDefinition): AiAgent {
  const { tools: _tools, knowledgeCategories: _kc, ...rest } = def;
  return {
    id: `agent_${def.slug}`,
    version: 1,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
    ...rest,
  };
}

const AGENTS: AiAgent[] = DEFAULT_AI_AGENTS.map(toAgent);

export const agents = {
  async list(): Promise<Result<AiAgent[]>> {
    return ok(AGENTS);
  },
  async bySlug(slug: string): Promise<Result<AiAgent>> {
    const match = AGENTS.find((a) => a.slug === slug);
    return match ? ok(match) : err({ code: 'not_found', message: 'Agent not found.' });
  },
  /** The raw definitions, e.g. for seeding the database. */
  async definitions(): Promise<Result<AiAgentDefinition[]>> {
    return ok(DEFAULT_AI_AGENTS);
  },
};
