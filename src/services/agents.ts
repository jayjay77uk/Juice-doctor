import 'server-only';

import type { AiAgent, AiAgentDefinition, AiAgentVersion, AgentStatus } from '@/types/ai';
import { DEFAULT_AI_AGENTS } from '@/config/ai-agents';
import { ok, err, type Result } from './result';

/**
 * AI agent service — the management read/write layer (NO inference).
 *
 * PROTOTYPE: a mutable in-process store seeded from the code registry
 * (src/config/ai-agents.ts). This makes the admin CRUD fully interactive during
 * a session without a database. PRODUCTION swaps this store for the `ai_agents`
 * table + `ai_agent_versions`; because agents are DATA, the admin UI and this
 * interface never change. Nothing about agent behaviour is hardcoded in the UI —
 * every field is read from here.
 */

const SEED_TS = '2026-07-10T00:00:00.000Z';
let idCounter = 0;

function toAgent(def: AiAgentDefinition): AiAgent {
  const { tools: _t, knowledgeCategories: _k, ...rest } = def;
  return { id: `agent_${def.slug}`, version: 1, createdAt: SEED_TS, updatedAt: SEED_TS, ...rest };
}

// In-process mutable store (prototype only).
const store: AiAgent[] = DEFAULT_AI_AGENTS.map(toAgent);
const versions: AiAgentVersion[] = store.map((a) => ({
  id: `ver_${a.id}_1`,
  agentId: a.id,
  version: 1,
  snapshot: { ...a },
  changeNote: 'Initial version',
  createdBy: a.ownerId,
  createdAt: SEED_TS,
}));

function nowIso(): string {
  return new Date().toISOString();
}

function snapshot(agent: AiAgent): AiAgentVersion {
  return {
    id: `ver_${agent.id}_${agent.version}`,
    agentId: agent.id,
    version: agent.version,
    snapshot: { ...agent },
    changeNote: `Version ${agent.version}`,
    createdBy: agent.ownerId,
    createdAt: nowIso(),
  };
}

export type AgentPatch = Partial<
  Pick<
    AiAgent,
    | 'name'
    | 'code'
    | 'description'
    | 'purpose'
    | 'role'
    | 'personality'
    | 'systemPrompt'
    | 'welcomeMessage'
    | 'responseBoundaries'
    | 'temperature'
    | 'maxOutputTokens'
    | 'defaultModelId'
    | 'memoryConfig'
    | 'safetyRules'
    | 'followUpConfig'
    | 'escalationConfig'
    | 'subscriptionAvailable'
    | 'product'
    | 'visibility'
    | 'status'
  >
>;

export const agents = {
  async list(): Promise<Result<AiAgent[]>> {
    return ok([...store].sort((a, b) => a.name.localeCompare(b.name)));
  },

  async byId(id: string): Promise<Result<AiAgent>> {
    const match = store.find((a) => a.id === id);
    return match ? ok(match) : err({ code: 'not_found', message: 'Agent not found.' });
  },

  async bySlug(slug: string): Promise<Result<AiAgent>> {
    const match = store.find((a) => a.slug === slug);
    return match ? ok(match) : err({ code: 'not_found', message: 'Agent not found.' });
  },

  async create(input: {
    name: string;
    slug: string;
    description: string;
    role: string;
    ownerId: string;
    organisationId: string;
  }): Promise<Result<AiAgent>> {
    if (store.some((a) => a.slug === input.slug)) {
      return err({ code: 'invalid', message: 'An agent with that slug already exists.' });
    }
    const agent: AiAgent = {
      id: `agent_new_${++idCounter}`,
      organisationId: input.organisationId,
      slug: input.slug,
      kind: 'specialist',
      product: null,
      name: input.name,
      code: '',
      description: input.description,
      purpose: 'Set the purpose of this specialist in the admin backend.',
      role: input.role,
      personality: 'Clear, helpful and professional.',
      systemPrompt: '',
      welcomeMessage: 'Hello — how can I help you today?',
      responseBoundaries: 'Answer using the assigned knowledge base. Stay within this specialist’s remit.',
      followUpConfig: { enabled: false, cadence: 'weekly', message: 'Checking in — how are things going?' },
      escalationConfig: { enabled: true, target: 'the team', channel: 'whatsapp', note: 'Escalate when the customer needs human help.' },
      subscriptionAvailable: false,
      temperature: 0.7,
      maxOutputTokens: 1024,
      defaultModelId: null,
      memoryConfig: {
        useUserMemory: true,
        useConversationMemory: true,
        useOrganisationMemory: false,
        useGlobalMemory: false,
      },
      safetyRules: { blockedTopics: [], requireDisclaimer: true, escalateOn: [] },
      visibility: 'private',
      status: 'draft',
      version: 1,
      ownerId: input.ownerId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.push(agent);
    versions.push(snapshot(agent));
    return ok(agent);
  },

  async update(id: string, patch: AgentPatch): Promise<Result<AiAgent>> {
    const agent = store.find((a) => a.id === id);
    if (!agent) return err({ code: 'not_found', message: 'Agent not found.' });
    Object.assign(agent, patch, { updatedAt: nowIso() });
    return ok(agent);
  },

  async setStatus(id: string, status: AgentStatus): Promise<Result<AiAgent>> {
    return agents.update(id, { status });
  },

  async publish(id: string): Promise<Result<AiAgent>> {
    const agent = store.find((a) => a.id === id);
    if (!agent) return err({ code: 'not_found', message: 'Agent not found.' });
    agent.status = 'active';
    agent.version += 1;
    agent.updatedAt = nowIso();
    versions.push(snapshot(agent));
    return ok(agent);
  },

  async duplicate(id: string): Promise<Result<AiAgent>> {
    const agent = store.find((a) => a.id === id);
    if (!agent) return err({ code: 'not_found', message: 'Agent not found.' });
    const copy: AiAgent = {
      ...agent,
      id: `agent_new_${++idCounter}`,
      slug: `${agent.slug}-copy`,
      name: `${agent.name} (copy)`,
      status: 'draft',
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.push(copy);
    versions.push(snapshot(copy));
    return ok(copy);
  },

  async archive(id: string): Promise<Result<AiAgent>> {
    return agents.setStatus(id, 'archived');
  },

  async versions(id: string): Promise<Result<AiAgentVersion[]>> {
    return ok(versions.filter((v) => v.agentId === id).sort((a, b) => b.version - a.version));
  },

  async definitions(): Promise<Result<AiAgentDefinition[]>> {
    return ok(DEFAULT_AI_AGENTS);
  },
};
