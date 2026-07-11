import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { ReceptionistRecommendation } from '@/types/crm';
import {
  CONFIDENCE_THRESHOLD,
  RECEPTIONIST_QUESTIONS,
  ROUTING_MAP,
  ESCALATION_TARGET,
  type ReceptionistQuestion,
  type EscalationTarget,
} from '@/config/receptionist';
import { agents } from './agents';
import { specialists } from './specialists';
import { ok, err, type Result } from './result';

/**
 * The Receptionist AI — the free front door. Its FUNCTION (receive → qualify →
 * summarise → recommend a specialist → create/update the CRM lead → escalate to
 * the client) is fixed; its behaviour is configuration.
 *
 * The recommendation below is a REPLACEABLE MOCK: it reads the configurable
 * threshold + routing map from `config/receptionist.ts`. It contains no approved
 * business rules (no domain matching, no scoring logic). Production swaps
 * `consult()` for live AI inference reading the same configuration, with no
 * change to the CRM or the frontend.
 */

export { CONFIDENCE_THRESHOLD };
export type { ReceptionistQuestion, EscalationTarget };

export const receptionist = {
  /** The receptionist agent record (identity/prompt/etc. managed like any agent). */
  async agent(): Promise<Result<AiAgent>> {
    const result = await agents.list();
    const match = (result.ok ? result.data : []).find((a) => a.kind === 'receptionist');
    return match ? ok(match) : err({ code: 'not_found', message: 'Receptionist not configured.' });
  },

  /** The (configurable, placeholder) consultation script. */
  questions: RECEPTIONIST_QUESTIONS,

  /** The configurable escalation target (the client or an authorised team member). */
  escalationTarget: ESCALATION_TARGET,

  /**
   * Produce a recommendation from consultation answers. MOCK: routes via the
   * configurable ROUTING_MAP and returns a placeholder confidence; escalates
   * below the configurable threshold. No approved rules are encoded here.
   */
  async consult(answers: Record<string, string>): Promise<Result<ReceptionistRecommendation>> {
    const all = await specialists.all();
    const list = all.ok ? all.data : [];
    const firstSlug = list[0]?.slug ?? null;

    const routedSlug = ROUTING_MAP[answers.q1 ?? ''] ?? firstSlug;
    const answered = Object.keys(answers).length;

    // Placeholder confidence — a stand-in only, not an approved rule.
    let confidence = answered >= RECEPTIONIST_QUESTIONS.length ? 0.72 : 0.5;
    confidence = Math.max(0.2, Math.min(0.9, confidence));
    const escalate = !routedSlug || confidence < CONFIDENCE_THRESHOLD;

    const name = list.find((s) => s.slug === routedSlug)?.name ?? 'a specialist';
    const alternativeSlug = list.find((s) => s.slug !== routedSlug)?.slug ?? null;

    return ok({
      specialistSlug: routedSlug ?? '',
      specialistName: name,
      confidence,
      reasoning: escalate
        ? `The receptionist could not confidently decide, so this has been routed to ${ESCALATION_TARGET.name} for review. (Prototype: replaceable mock.)`
        : `Based on the consultation, ${name} is the suggested specialist. (Prototype: replaceable mock — routing is admin-configurable.)`,
      escalate,
      alternativeSlug,
    });
  },

  /** Business stats about the receptionist's performance (mock). */
  async stats(): Promise<Result<{ consultations30d: number; recommendationRate: number; escalationRate: number; avgConfidence: number }>> {
    return ok({ consultations30d: 0, recommendationRate: 0, escalationRate: 0, avgConfidence: 0 });
  },
};
