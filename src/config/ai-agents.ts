import type { AiAgentDefinition, AgentMemoryConfig, AgentSafetyRules } from '@/types/ai';

/**
 * The AI-agent roster — agents defined as DATA (seed the `ai_agents` table).
 *
 * This models an AI agent system that represents the client, NOT a generic
 * marketplace and NOT an AI builder:
 *  • ONE free Receptionist AI is the front door for every visitor (its function
 *    is defined; its exact wording/prompt is client-supplied and admin-editable).
 *  • FOUR Specialist AIs are subscription agents. Their final names, codes,
 *    purposes, system behaviour, pricing and knowledge are NOT YET SUPPLIED, so
 *    they are configurable PLACEHOLDERS here ("Specialist AI 1–4"). The admin
 *    configures every field; the multi-agent architecture is unchanged.
 *
 * No product names, descriptions, prices, roles or rules are invented here.
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

type DefInput = Partial<AiAgentDefinition> &
  Pick<AiAgentDefinition, 'slug' | 'name' | 'role' | 'kind' | 'description'>;

function makeAgent(input: DefInput): AiAgentDefinition {
  return {
    organisationId: PROTOTYPE_ORG,
    product: null,
    personality: '[Configurable]',
    systemPrompt: '[Configurable]',
    temperature: 0.5,
    maxOutputTokens: 1024,
    defaultModelId: null,
    memoryConfig: DEFAULT_MEMORY,
    safetyRules: DEFAULT_SAFETY,
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
    name: `Specialist AI ${n}`,
    role: '[Specialist role required]',
    description: '[Specialist description required]',
    systemPrompt: '[Specialist system behaviour required]',
    product: {
      tagline: '[Approved description required]',
      expertise: [],
      priceLabel: '[Price required]',
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
    name: 'Receptionist AI',
    role: 'AI receptionist — reception, qualification, routing & escalation',
    description:
      'The free AI that receives every visitor: it understands their request, asks relevant follow-up questions, summarises what they said, determines which approved specialist AI may suit them, creates or updates the CRM lead, and escalates to the client when it cannot confidently decide (with WhatsApp handoff when direct human contact is needed).',
    systemPrompt:
      'You are the AI receptionist representing the client. Receive the visitor, understand their request, ask relevant follow-up questions, and organise and summarise what they have said. Determine which approved specialist AI may suit them. Create or update the CRM lead. Escalate the conversation to the client when you cannot confidently decide, and support a WhatsApp handoff when the visitor needs direct human contact. Do not invent services or make claims beyond the client’s approved offering.',
    temperature: 0.4,
    visibility: 'public',
    status: 'active',
    tools: ['search_knowledge', 'recommend_specialist', 'create_lead', 'escalate_to_client', 'whatsapp_handoff'],
    knowledgeCategories: [],
  }),
  ...SPECIALIST_PLACEHOLDERS,
];
