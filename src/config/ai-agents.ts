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
 *  • ONE free Receptionist AI is the front door for every visitor.
 *  • FOUR Specialist AIs are subscription products. Their final names, codes,
 *    purposes, behaviour, pricing and knowledge are NOT YET SUPPLIED, so they
 *    are configurable PLACEHOLDERS here ("Specialist AI 1–4") in clear English.
 *    The admin edits every field; the multi-agent architecture is unchanged.
 *
 * No final product names, descriptions, prices, roles or rules are invented.
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

const ACCENTS = ['teal', 'green', 'amber', 'sage'] as const;

/** Four configurable specialist placeholders — every field is admin-editable. */
const SPECIALIST_PLACEHOLDERS: AiAgentDefinition[] = [1, 2, 3, 4].map((n) =>
  makeAgent({
    kind: 'specialist',
    slug: `specialist-ai-${n}`,
    code: `SP-${n}`,
    name: `Specialist AI ${n}`,
    role: 'Specialist AI (configure in admin)',
    description:
      'This is a configurable specialist AI. Its name, description, behaviour and knowledge are set in the admin backend.',
    purpose: 'Set the purpose of this specialist in the admin backend.',
    systemPrompt: `You are Specialist AI ${n}. Follow the behaviour, boundaries and knowledge configured in the admin backend. Do not make claims beyond the client’s approved offering.`,
    welcomeMessage: `Hello — I am Specialist AI ${n}. How can I help you today?`,
    responseBoundaries:
      'Answer using the assigned knowledge base. Stay within this specialist’s remit. Hand over to a person when the customer needs human help.',
    status: 'active',
    visibility: 'public',
    subscriptionAvailable: true,
    product: {
      tagline: 'A configurable specialist AI product.',
      expertise: ['Configure this specialist’s expertise in the admin backend.'],
      priceLabel: 'Price on request',
      priceAmount: 0,
      interval: 'month',
      accent: ACCENTS[(n - 1) % ACCENTS.length] ?? 'teal',
    },
  }),
);

export const DEFAULT_AI_AGENTS: AiAgentDefinition[] = [
  // The free front door. Function per the approved receptionist brief; wording configurable.
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
  ...SPECIALIST_PLACEHOLDERS,
];
