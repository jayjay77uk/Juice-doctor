import 'server-only';

import type { SafetyPolicy } from '@/types/ai-platform';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, type Result } from './result';

/**
 * Safety policies — configurable guardrails stored in ai_safety_policies
 * (migration 0014). Real rows: the two baseline policies seed idempotently as
 * configuration data. NOTE: the RUNTIME safety checks (emergency block,
 * medication boundary, citation stripping) are enforced in code today; wiring
 * these configurable policies into inference is a follow-up.
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

export const safety = {
  async list(): Promise<Result<SafetyPolicy[]>> {
    const sb = createAdminClient();
    if (!sb) return ok([]);
    await ensureSeed(sb);
    const { data } = await sb.from('ai_safety_policies').select('*').eq('organisation_id', ORG).order('created_at');
    return ok((data ?? []).map(rowToPolicy));
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
