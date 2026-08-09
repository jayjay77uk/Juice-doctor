import 'server-only';

import type { AiAgent } from '@/types/ai';
import { agentsRepo } from './repositories/agents-repo';

/**
 * AI-agent service — agents are DATA in the ai_agents table (the eight HERNE
 * specialists seeded from the client pack + the Receptionist AI; staff add more
 * from the admin backend). All reads/writes go through the repository, which
 * seeds the roster idempotently on first use. No mock data.
 */

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

export const agents = agentsRepo;
