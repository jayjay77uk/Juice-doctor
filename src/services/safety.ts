import 'server-only';

import type { SafetyPolicy } from '@/types/ai-platform';
import { ok, err, type Result } from './result';

/**
 * AI safety management. Policies are fully configurable data (topics, medical
 * boundaries, escalation, filters, thresholds) — nothing is hardcoded. Prototype
 * uses an in-process store; production reads ai_safety_policies (migration 0014).
 */

const ORG = '00000000-0000-0000-0000-000000000001';
let counter = 0;

const policies: SafetyPolicy[] = [
  {
    id: 'policy_default',
    organisationId: ORG,
    name: 'Default wellbeing safety policy',
    description: 'Baseline guardrails for all member-facing agents. Health-safe by default.',
    allowedTopics: ['nutrition', 'hydration', 'sleep', 'movement', 'stress', 'habits', 'HERNE Protocol'],
    restrictedTopics: ['diagnosis', 'prescription', 'dosage', 'medication changes'],
    medicalBoundaries: [
      'Never diagnose a condition',
      'Never recommend or change medication',
      'Always advise seeing a professional for medical concerns',
    ],
    emergencyResponses: {
      self_harm: 'Provide crisis resources immediately and escalate to a human.',
      acute_symptoms: 'Advise seeking urgent medical care; do not attempt triage.',
    },
    contentFilters: { profanity: 'block', pii: 'redact' },
    escalationRules: { onLowConfidence: 'handoff', onRestrictedTopic: 'decline_and_redirect' },
    roleRestrictions: [],
    confidenceThreshold: 0.7,
    humanEscalation: true,
    status: 'active',
    updatedAt: '2026-07-10T00:00:00.000Z',
  },
  {
    id: 'policy_practitioner',
    organisationId: ORG,
    name: 'Practitioner-copilot policy',
    description: 'Looser boundaries for the staff-only practitioner copilot; still non-prescriptive.',
    allowedTopics: ['clinical guidance', 'summaries', 'protocol interpretation'],
    restrictedTopics: ['prescription'],
    medicalBoundaries: ['Defer all clinical judgement to the practitioner'],
    emergencyResponses: {},
    contentFilters: { pii: 'redact' },
    escalationRules: {},
    roleRestrictions: ['practitioner', 'staff', 'administrator'],
    confidenceThreshold: 0.6,
    humanEscalation: false,
    status: 'active',
    updatedAt: '2026-07-10T00:00:00.000Z',
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

export const safety = {
  async list(): Promise<Result<SafetyPolicy[]>> {
    return ok([...policies]);
  },
  async byId(id: string): Promise<Result<SafetyPolicy>> {
    const match = policies.find((p) => p.id === id);
    return match ? ok(match) : err({ code: 'not_found', message: 'Policy not found.' });
  },
  async save(id: string | null, patch: Partial<SafetyPolicy>): Promise<Result<SafetyPolicy>> {
    if (id) {
      const policy = policies.find((p) => p.id === id);
      if (!policy) return err({ code: 'not_found', message: 'Policy not found.' });
      Object.assign(policy, patch, { updatedAt: nowIso() });
      return ok(policy);
    }
    const created: SafetyPolicy = {
      id: `policy_new_${++counter}`,
      organisationId: ORG,
      name: patch.name ?? 'New policy',
      description: patch.description ?? null,
      allowedTopics: patch.allowedTopics ?? [],
      restrictedTopics: patch.restrictedTopics ?? [],
      medicalBoundaries: patch.medicalBoundaries ?? [],
      emergencyResponses: patch.emergencyResponses ?? {},
      contentFilters: patch.contentFilters ?? {},
      escalationRules: patch.escalationRules ?? {},
      roleRestrictions: patch.roleRestrictions ?? [],
      confidenceThreshold: patch.confidenceThreshold ?? 0.7,
      humanEscalation: patch.humanEscalation ?? true,
      status: patch.status ?? 'active',
      updatedAt: nowIso(),
    };
    policies.push(created);
    return ok(created);
  },
};
