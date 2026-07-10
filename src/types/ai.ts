/**
 * AI framework model — mirrors migration 0009. This is ARCHITECTURE ONLY: it
 * describes agents, tools, models and configuration as DATA so the client can
 * create unlimited agents without code changes. No inference logic lives here.
 */

export type AgentVisibility = 'private' | 'organisation' | 'public';
export type AgentStatus = 'draft' | 'active' | 'disabled' | 'archived';
export type AgentKnowledgeMode = 'include' | 'exclude';

export interface AiModelProvider {
  id: string;
  organisationId: string | null; // null = platform-global
  key: string; // e.g. 'anthropic'
  displayName: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface AiModel {
  id: string;
  providerId: string;
  modelKey: string; // e.g. 'claude-opus-4-8'
  displayName: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  capabilities: Record<string, unknown>;
  enabled: boolean;
}

export interface AiTool {
  id: string;
  organisationId: string;
  key: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handlerRef: string;
  isSensitive: boolean;
  enabled: boolean;
}

/** How an agent may use memory. Mirrors the ai_agents.memory_config jsonb. */
export interface AgentMemoryConfig {
  useUserMemory: boolean;
  useConversationMemory: boolean;
  useOrganisationMemory: boolean;
  useGlobalMemory: boolean;
  /** Max memory items injected into context. */
  maxItems?: number;
}

/** Guardrails enforced around an agent. Mirrors ai_agents.safety_rules jsonb. */
export interface AgentSafetyRules {
  blockedTopics: string[];
  requireDisclaimer: boolean;
  /** Escalate to a human practitioner when these intents are detected. */
  escalateOn: string[];
  maxTurns?: number;
}

export interface AiAgent {
  id: string;
  organisationId: string;
  slug: string;
  name: string;
  description: string;
  role: string;
  personality: string;
  systemPrompt: string;
  temperature: number;
  maxOutputTokens: number | null;
  defaultModelId: string | null;
  memoryConfig: AgentMemoryConfig;
  safetyRules: AgentSafetyRules;
  visibility: AgentVisibility;
  status: AgentStatus;
  version: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgentVersion {
  id: string;
  agentId: string;
  version: number;
  snapshot: Record<string, unknown>;
  changeNote: string;
  createdBy: string;
  createdAt: string;
}

export interface AiAgentTool {
  agentId: string;
  toolId: string;
  config: Record<string, unknown>;
}

export interface AiAgentKnowledgeSource {
  agentId: string;
  categoryId: string | null;
  documentId: string | null;
  mode: AgentKnowledgeMode;
}

export interface AiConfiguration {
  id: string;
  organisationId: string | null;
  key: string;
  value: Record<string, unknown>;
  description: string;
}

/** The full definition needed to instantiate an agent (used by the registry). */
export type AiAgentDefinition = Omit<AiAgent, 'id' | 'createdAt' | 'updatedAt' | 'version'> & {
  tools: string[]; // tool keys
  knowledgeCategories: string[]; // category slugs
};
