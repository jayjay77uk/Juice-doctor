import type {
  AiAgentDefinition,
  AgentMemoryConfig,
  AgentSafetyRules,
  AgentFollowUpConfig,
  AgentEscalationConfig,
} from '@/types/ai';

/**
 * The AI-agent roster — agents defined as DATA (seed the `ai_agents` table).
 *
 * This models an AI agent system that represents the client, NOT a generic
 * marketplace and NOT an AI builder:
 *  • ONE free Receptionist AI is the front door for every visitor (routing +
 *    escalation infrastructure; it is not a user-facing specialist).
 *
 * The eight user-facing specialists are the client-approved HERNE team (Makela,
 * Serena, Atlas, Aqua, Sage, Luca, Felix, Optimus). They are seeded from the
 * client HERNE developer pack by `services/herne/seed.ts` (with their evidence,
 * prompts and config) — NOT from this file. The generic multi-agent architecture
 * is preserved: staff can add further agents from the admin backend via the same
 * `makeAgent` shape, with no code change.
 */

const PROTOTYPE_ORG = '00000000-0000-0000-0000-000000000001';
const SYSTEM_OWNER = 'usr_super';

const DEFAULT_MEMORY: AgentMemoryConfig = {
  useUserMemory: true,
  useConversationMemory: true,
  useOrganisationMemory: true,
  useGlobalMemory: true,
};

const DEFAULT_SAFETY: AgentSafetyRules = {
  blockedTopics: [],
  requireDisclaimer: true,
  escalateOn: [],
};

const DEFAULT_FOLLOW_UP: AgentFollowUpConfig = {
  enabled: true,
  cadence: 'weekly',
  message: 'Checking in — how are things going? Reply here whenever you are ready.',
};

const DEFAULT_ESCALATION: AgentEscalationConfig = {
  enabled: true,
  target: 'the team',
  channel: 'whatsapp',
  note: 'Escalate to a member of the team when the customer needs human help.',
};

type DefInput = Partial<AiAgentDefinition> &
  Pick<AiAgentDefinition, 'slug' | 'name' | 'role' | 'kind' | 'description'>;

function makeAgent(input: DefInput): AiAgentDefinition {
  return {
    organisationId: PROTOTYPE_ORG,
    product: null,
    code: '',
    purpose: 'Set the purpose of this AI in the admin backend.',
    personality: 'Clear, helpful and professional.',
    systemPrompt: 'Configure this AI’s behaviour in the admin backend.',
    welcomeMessage: 'Hello — how can I help you today?',
    responseBoundaries: 'Stay within the topics configured for this AI. Do not give advice outside its remit.',
    temperature: 0.5,
    maxOutputTokens: 1024,
    defaultModelId: null,
    memoryConfig: DEFAULT_MEMORY,
    safetyRules: DEFAULT_SAFETY,
    followUpConfig: DEFAULT_FOLLOW_UP,
    escalationConfig: DEFAULT_ESCALATION,
    subscriptionAvailable: false,
    visibility: 'organisation',
    status: 'draft',
    ownerId: SYSTEM_OWNER,
    tools: [],
    knowledgeCategories: [],
    ...input,
  };
}

/**
 * The seed roster for a fresh install: ONLY the Receptionist AI (routing +
 * escalation infrastructure). The eight HERNE specialists are seeded separately
 * by `services/herne/seed.ts`, so a fresh installation creates exactly eight
 * specialists (all HERNE) plus this one receptionist. Additional specialists are
 * added by staff through the admin backend — no code change required.
 */
export const DEFAULT_AI_AGENTS: AiAgentDefinition[] = [
  makeAgent({
    kind: 'receptionist',
    slug: 'receptionist',
    code: 'RECEPTION',
    name: 'Receptionist AI',
    role: 'AI receptionist — reception, qualification, routing & escalation',
    description:
      'The free AI that receives every visitor: it understands their request, asks relevant follow-up questions, summarises what they said, determines which approved specialist AI may suit them, creates or updates the CRM lead, and escalates to the client when it cannot confidently decide (with WhatsApp handoff when direct human contact is needed).',
    purpose: 'Receive every visitor, qualify their request, recommend a specialist, and escalate to a human when unsure.',
    systemPrompt:
      'You are the AI receptionist representing the client. Receive the visitor, understand their request, ask relevant follow-up questions, and organise and summarise what they have said. Determine which approved specialist AI may suit them. Create or update the CRM lead. Escalate the conversation to the client when you cannot confidently decide, and support a WhatsApp handoff when the visitor needs direct human contact. Do not invent services or make claims beyond the client’s approved offering.',
    welcomeMessage: 'Hello, and welcome. Tell me what you need help with and I will point you to the right place.',
    responseBoundaries: 'Only reception, qualification, routing and escalation. Do not answer specialist questions directly.',
    temperature: 0.4,
    visibility: 'public',
    status: 'active',
    tools: ['search_knowledge', 'recommend_specialist', 'create_lead', 'escalate_to_client', 'whatsapp_handoff'],
    knowledgeCategories: [],
  }),
];
