import type { AiAgentDefinition, AgentMemoryConfig, AgentSafetyRules } from '@/types/ai';

/**
 * The AI-business roster — agents defined as DATA, not code.
 *
 * This is not a generic "agent builder": it models a real AI BUSINESS.
 *  • ONE Receptionist AI is the front door for every visitor — it consults,
 *    qualifies, recommends a specialist, creates a CRM lead and escalates to the
 *    human expert when its confidence is low.
 *  • Specialist AIs are customer-facing SUBSCRIPTION PRODUCTS, each with its own
 *    identity, knowledge, prompts, behaviour, memory, subscribers and analytics.
 *  • Internal agents support staff and are not sold.
 *
 * In production these seed the `ai_agents` table; the client edits them (and adds
 * more specialists) from the admin dashboard. NO inference runs in the prototype.
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
  blockedTopics: ['diagnosis', 'prescription', 'emergency_medical'],
  requireDisclaimer: true,
  escalateOn: ['self_harm', 'acute_symptoms', 'medication_change'],
  maxTurns: 40,
};

type DefInput = Partial<AiAgentDefinition> &
  Pick<AiAgentDefinition, 'slug' | 'name' | 'role' | 'kind' | 'description'>;

function makeAgent(input: DefInput): AiAgentDefinition {
  const systemPrompt =
    input.systemPrompt ??
    `You are ${input.name}, the ${input.role} at Ask Juice Doctor. Help your subscriber make sustainable progress, grounded in the HERNE Protocol. Be warm, practical and encouraging. You are NOT a doctor: never diagnose or change medication, and recommend seeing a professional for medical concerns. If anything sounds clinically serious, escalate to a human.`;
  return {
    organisationId: PROTOTYPE_ORG,
    product: null,
    personality: 'Warm, encouraging, plain-spoken. Grounded in the HERNE Protocol.',
    temperature: 0.6,
    maxOutputTokens: 1024,
    defaultModelId: null,
    memoryConfig: DEFAULT_MEMORY,
    safetyRules: DEFAULT_SAFETY,
    visibility: 'public',
    status: 'active',
    ownerId: SYSTEM_OWNER,
    tools: ['search_knowledge'],
    knowledgeCategories: ['herne-protocol'],
    ...input,
    systemPrompt,
  };
}

export const DEFAULT_AI_AGENTS: AiAgentDefinition[] = [
  // ── The front door ─────────────────────────────────────────────────────────
  makeAgent({
    kind: 'receptionist',
    slug: 'receptionist',
    name: 'The Receptionist',
    role: 'AI front desk · consultation, qualification & routing',
    description:
      'The first AI every visitor meets. Understands what a person needs, recommends the right specialist AI, captures the lead, and hands off to WhatsApp or a human expert when confidence is low.',
    personality:
      'Welcoming, efficient and reassuring. Asks one clear question at a time. Never overpromises; routes people to the right place.',
    systemPrompt:
      'You are the Ask Juice Doctor Receptionist. Greet visitors warmly, understand their wellbeing goals through a short consultation, and recommend the single best specialist AI for them. Capture their details as a lead. If you are not confident, or if anything sounds clinically serious, escalate to a human expert rather than guessing. You never diagnose or prescribe.',
    temperature: 0.4,
    tools: ['search_knowledge', 'recommend_specialist', 'create_lead', 'escalate_to_human', 'whatsapp_handoff'],
    knowledgeCategories: ['herne-protocol', 'intake'],
    safetyRules: { ...DEFAULT_SAFETY, escalateOn: [...DEFAULT_SAFETY.escalateOn, 'low_confidence', 'red_flag_symptom'] },
  }),

  // ── Specialist AI subscription products ──────────────────────────────────────
  makeAgent({
    kind: 'specialist',
    slug: 'hydration-specialist',
    name: 'The Hydration Specialist',
    role: 'Cellular hydration coach',
    description:
      'A dedicated AI specialist for hydration — the foundation pillar. Helps subscribers reach true cellular hydration and understand how water drives energy, focus and recovery.',
    product: {
      tagline: 'Master the foundation pillar: true cellular hydration.',
      expertise: ['Personalised hydration targets', 'Electrolyte & mineral balance', 'Energy and focus from water', 'Daily tracking & nudges'],
      priceLabel: '£19 / month',
      priceAmount: 1900,
      interval: 'month',
      accent: 'teal',
    },
    knowledgeCategories: ['hydration', 'herne-protocol'],
  }),
  makeAgent({
    kind: 'specialist',
    slug: 'nutrition-specialist',
    name: 'The Nutrition Specialist',
    role: 'Nutrient-density nutrition coach',
    description:
      'An AI specialist for nutrition — food as information, not restriction. Builds sustainable, nutrient-dense eating around each subscriber’s life and goals.',
    product: {
      tagline: 'Eat for energy — nutrient density over restriction.',
      expertise: ['Sustainable, real-food guidance', 'Blood-sugar & energy stability', 'Cravings and habits', 'Meal ideas tuned to you'],
      priceLabel: '£24 / month',
      priceAmount: 2400,
      interval: 'month',
      accent: 'amber',
    },
    knowledgeCategories: ['nutrition', 'herne-protocol'],
  }),
  makeAgent({
    kind: 'specialist',
    slug: 'sleep-specialist',
    name: 'The Sleep & Recovery Specialist',
    role: 'Rest & recovery coach',
    description:
      'An AI specialist for the rest pillar. Helps subscribers rebuild restorative sleep and nervous-system recovery — where real change happens.',
    product: {
      tagline: 'Rebuild the sleep that lets your body restore itself.',
      expertise: ['Sleep quality & rhythm', 'Wind-down routines', 'Nervous-system recovery', 'Stress & recovery balance'],
      priceLabel: '£19 / month',
      priceAmount: 1900,
      interval: 'month',
      accent: 'sage',
    },
    knowledgeCategories: ['herne-protocol'],
  }),
  makeAgent({
    kind: 'specialist',
    slug: 'movement-specialist',
    name: 'The Movement Specialist',
    role: 'Restorative movement coach',
    description:
      'An AI specialist for the exercise pillar — movement that restores rather than depletes, matched to where a subscriber’s body actually is.',
    product: {
      tagline: 'Movement that gives back more than it takes.',
      expertise: ['Movement matched to your capacity', 'Circulation & lymphatic flow', 'Strength and resilience', 'Gentle progression'],
      priceLabel: '£19 / month',
      priceAmount: 1900,
      interval: 'month',
      accent: 'green',
    },
    knowledgeCategories: ['herne-protocol'],
  }),
  makeAgent({
    kind: 'specialist',
    slug: 'wellbeing-companion',
    name: 'The Wellbeing Companion',
    role: 'All-round HERNE companion',
    description:
      'A generalist AI companion across all five HERNE pillars — the everyday guide for subscribers who want one assistant for the whole journey.',
    product: {
      tagline: 'One companion for all five pillars of your reset.',
      expertise: ['Everyday HERNE guidance', 'Habit nudges & check-ins', 'Answers across all pillars', 'Progress encouragement'],
      priceLabel: '£15 / month',
      priceAmount: 1500,
      interval: 'month',
      accent: 'teal',
    },
    knowledgeCategories: ['herne-protocol', 'nutrition', 'hydration'],
  }),

  // ── Internal (staff-only) ────────────────────────────────────────────────────
  makeAgent({
    kind: 'internal',
    slug: 'practitioner-copilot',
    name: 'Practitioner Copilot',
    role: 'Staff productivity copilot',
    description:
      'A staff-only assistant that drafts consultation summaries and surfaces relevant knowledge for practitioners handling escalations.',
    personality: 'Concise, precise, evidence-oriented. Cites its sources.',
    systemPrompt:
      'You assist Ask Juice Doctor practitioners handling escalated cases. Draft summaries, surface relevant protocol guidance, and prepare follow-ups. Always cite sources. Defer all clinical judgement to the practitioner.',
    temperature: 0.2,
    visibility: 'private',
    tools: ['search_knowledge', 'summarise_case'],
    knowledgeCategories: ['herne-protocol', 'clinical-guidance'],
    safetyRules: { blockedTopics: [], requireDisclaimer: false, escalateOn: [] },
  }),
];
