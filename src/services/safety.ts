import 'server-only';

import type { SafetyPolicy } from '@/types/ai-platform';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, type Result } from './result';

/**
 * Safety policies — configurable guardrails stored in ai_safety_policies
 * (migration 0014). The hard-coded HERNE safety floor (emergency/self-harm,
 * medication/diagnosis boundary, citation stripping) always remains in force.
 * Active managed policies are an ADDITIVE layer: organisation-global policies
 * (no role restrictions) apply to every specialist, while role-restricted
 * policies apply only when explicitly assigned through ai_agent_safety_policies.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

const SEED_POLICIES = [
  {
    name: 'Default safety policy',
    description: 'Baseline guardrails for all member-facing agents. Safe by default.',
    allowed_topics: ['general enquiries', 'account help', 'product information', 'onboarding', 'billing', 'the framework'],
    restricted_topics: ['legal advice', 'financial advice', 'sensitive personal data'],
    medical_boundaries: [
      'Never provide advice outside the configured scope',
      'Never make decisions on the user’s behalf',
      'Always advise contacting a professional for specialist concerns',
    ],
    emergency_responses: {
      self_harm: 'Provide crisis resources immediately and escalate to a human.',
      acute_symptoms: 'Advise seeking urgent professional help; do not attempt to assess.',
    },
    content_filters: { profanity: 'block', pii: 'redact' },
    escalation_rules: { onLowConfidence: 'handoff', onRestrictedTopic: 'decline_and_redirect' },
    role_restrictions: [] as string[],
    confidence_threshold: 0.7,
    human_escalation: true,
    status: 'active',
  },
  {
    name: 'Practitioner-copilot policy',
    description: 'Looser boundaries for the staff-only practitioner copilot; still non-authoritative.',
    allowed_topics: ['operational guidance', 'summaries', 'framework interpretation'],
    restricted_topics: ['approvals'],
    medical_boundaries: ['Defer all final judgement to the practitioner'],
    emergency_responses: {},
    content_filters: { pii: 'redact' },
    escalation_rules: {},
    role_restrictions: ['practitioner', 'staff', 'administrator'],
    confidence_threshold: 0.6,
    human_escalation: false,
    status: 'active',
  },
];

let seeded = false;

async function ensureSeed(sb: SupabaseClient): Promise<void> {
  if (seeded) return;
  const { count, error } = await sb.from('ai_safety_policies').select('id', { count: 'exact', head: true }).eq('organisation_id', ORG);
  if (error) return;
  if ((count ?? 0) === 0) {
    await sb.from('ai_safety_policies').insert(SEED_POLICIES.map((p) => ({ ...p, organisation_id: ORG })));
  }
  seeded = true;
}

function rowToPolicy(r: Record<string, unknown>): SafetyPolicy {
  return {
    id: String(r.id),
    organisationId: String(r.organisation_id ?? ORG),
    name: String(r.name),
    description: (r.description as string | null) ?? '',
    allowedTopics: Array.isArray(r.allowed_topics) ? (r.allowed_topics as string[]) : [],
    restrictedTopics: Array.isArray(r.restricted_topics) ? (r.restricted_topics as string[]) : [],
    medicalBoundaries: Array.isArray(r.medical_boundaries) ? (r.medical_boundaries as string[]) : [],
    emergencyResponses: (r.emergency_responses as Record<string, string>) ?? {},
    contentFilters: (r.content_filters as Record<string, unknown>) ?? {},
    escalationRules: (r.escalation_rules as Record<string, unknown>) ?? {},
    roleRestrictions: Array.isArray(r.role_restrictions) ? (r.role_restrictions as SafetyPolicy['roleRestrictions']) : [],
    confidenceThreshold: Number(r.confidence_threshold ?? 0.7),
    humanEscalation: Boolean(r.human_escalation),
    status: (r.status as SafetyPolicy['status']) ?? 'active',
    updatedAt: String(r.updated_at ?? r.created_at ?? new Date().toISOString()),
  };
}

function compactJson(value: Record<string, unknown> | Record<string, string>): string | null {
  if (!value || Object.keys(value).length === 0) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function normaliseWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

/**
 * Deterministic restricted-topic check used BEFORE inference. This is deliberately
 * conservative: every meaningful word in a configured topic must occur in the
 * user's message. The model prompt still carries the full policy for semantic
 * cases that do not meet this exact pre-block test.
 */
export function restrictedTopicMatch(text: string, policies: SafetyPolicy[]): { topic: string; policy: SafetyPolicy } | null {
  const inputWords = new Set(normaliseWords(text));
  if (inputWords.size === 0) return null;
  for (const policy of policies) {
    for (const topic of policy.restrictedTopics) {
      const topicWords = normaliseWords(topic);
      if (topicWords.length > 0 && topicWords.every((word) => inputWords.has(word))) return { topic, policy };
    }
  }
  return null;
}

/** Serialize active database policy data into a non-optional inference block. */
export function safetyPolicyPrompt(policies: SafetyPolicy[]): string | null {
  if (!policies.length) return null;
  const blocks = policies.map((policy) => {
    const lines = [
      `POLICY: ${policy.name}`,
      policy.description ? `Purpose: ${policy.description}` : null,
      policy.allowedTopics.length ? `Permitted/example topics: ${policy.allowedTopics.join('; ')}` : null,
      policy.restrictedTopics.length ? `Restricted topics — decline and redirect: ${policy.restrictedTopics.join('; ')}` : null,
      policy.medicalBoundaries.length ? `Medical/scope boundaries:\n${policy.medicalBoundaries.map((x) => `- ${x}`).join('\n')}` : null,
      compactJson(policy.emergencyResponses) ? `Configured emergency directives: ${compactJson(policy.emergencyResponses)}` : null,
      compactJson(policy.contentFilters) ? `Configured content filters: ${compactJson(policy.contentFilters)}` : null,
      compactJson(policy.escalationRules) ? `Configured escalation rules: ${compactJson(policy.escalationRules)}` : null,
      `Human escalation enabled: ${policy.humanEscalation ? 'yes' : 'no'}. Confidence threshold: ${policy.confidenceThreshold}.`,
    ];
    return lines.filter(Boolean).join('\n');
  });
  return [
    'ADMIN-MANAGED SAFETY POLICIES — ACTIVE AND ENFORCED. These rules are additive to the fixed safety floor below; never weaken or ignore the fixed emergency, diagnosis, medication or evidence rules. “Permitted/example topics” are guidance, not an exhaustive allow-list unless a policy explicitly says so.',
    ...blocks,
  ].join('\n\n');
}

export const safety = {
  async list(): Promise<Result<SafetyPolicy[]>> {
    const sb = createAdminClient();
    if (!sb) return ok([]);
    await ensureSeed(sb);
    const { data } = await sb.from('ai_safety_policies').select('*').eq('organisation_id', ORG).order('created_at');
    return ok((data ?? []).map(rowToPolicy));
  },

  /** Active policies that actually apply to one specialist at runtime. */
  async activeForAgent(agentId: string): Promise<SafetyPolicy[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    await ensureSeed(sb);
    const [{ data: rows, error }, { data: assignments }] = await Promise.all([
      sb.from('ai_safety_policies').select('*').eq('organisation_id', ORG).eq('status', 'active').order('created_at'),
      sb.from('ai_agent_safety_policies').select('policy_id').eq('agent_id', agentId),
    ]);
    if (error) return [];
    const assigned = new Set((assignments ?? []).map((row) => String(row.policy_id)));
    return (rows ?? [])
      .map(rowToPolicy)
      .filter((policy) => policy.roleRestrictions.length === 0 || assigned.has(policy.id));
  },

  async byId(id: string): Promise<Result<SafetyPolicy>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Safety policies are not available.' });
    const { data } = await sb.from('ai_safety_policies').select('*').eq('id', id).maybeSingle();
    return data ? ok(rowToPolicy(data)) : err({ code: 'not_found', message: 'Policy not found.' });
  },
  async save(id: string | null, patch: Partial<SafetyPolicy>): Promise<Result<SafetyPolicy>> {
    const sb = createAdminClient();
    if (!sb) return err({ code: 'unavailable', message: 'Safety policies are not available.' });
    const row: Record<string, unknown> = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.allowedTopics !== undefined ? { allowed_topics: patch.allowedTopics } : {}),
      ...(patch.restrictedTopics !== undefined ? { restricted_topics: patch.restrictedTopics } : {}),
      ...(patch.medicalBoundaries !== undefined ? { medical_boundaries: patch.medicalBoundaries } : {}),
      ...(patch.emergencyResponses !== undefined ? { emergency_responses: patch.emergencyResponses } : {}),
      ...(patch.contentFilters !== undefined ? { content_filters: patch.contentFilters } : {}),
      ...(patch.escalationRules !== undefined ? { escalation_rules: patch.escalationRules } : {}),
      ...(patch.confidenceThreshold !== undefined ? { confidence_threshold: patch.confidenceThreshold } : {}),
      ...(patch.humanEscalation !== undefined ? { human_escalation: patch.humanEscalation } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    };
    if (id) {
      const { data, error } = await sb
        .from('ai_safety_policies')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error || !data) return err({ code: 'not_found', message: 'Policy not found.' });
      return ok(rowToPolicy(data));
    }
    const { data, error } = await sb
      .from('ai_safety_policies')
      .insert({ organisation_id: ORG, name: patch.name ?? 'New policy', ...row })
      .select('*')
      .single();
    if (error || !data) return err({ code: 'invalid', message: 'Could not save the policy.' });
    return ok(rowToPolicy(data));
  },
};