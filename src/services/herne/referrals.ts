import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from './records';
import { carePlan, timeline } from './care-plan';
import { herneProfile } from '@/data/herne/specialist-profiles';
import { loadReferralMatrix, isHumanEscalation, normalizeSpecialistRef, isWildcardRef } from './referral-matrix';

export { isHumanEscalation } from './referral-matrix';

/**
 * HERNE referral + escalation engines. Referrals preserve full context so the
 * receiving specialist never asks the user to start over; every referral updates
 * the shared care plan and the journey timeline and is itself the audit record.
 * Escalations (low confidence, outside scope, emergency, human/clinical review,
 * admin support) are recorded with trigger, reason, specialist and destination.
 */

export interface ReferralRule {
  fromSpecialist: string;
  toSpecialist: string;
  trigger: string;
  urgency: string | null;
  handoffInstruction: string | null;
  isHumanEscalation: boolean;
}

/** Seed the client referral matrix into herne_referral_rules (idempotent). */
export async function seedReferralRules(): Promise<{ count: number; humanEscalations: number }> {
  const sb = createAdminClient();
  if (!sb) return { count: 0, humanEscalations: 0 };
  const rules = loadReferralMatrix();
  let humanEscalations = 0;
  const rows = rules.map((r) => {
    const human = isHumanEscalation(r.to_specialist);
    if (human) humanEscalations += 1;
    return {
      organisation_id: HERNE_ORG,
      from_specialist: r.from_specialist,
      to_specialist: r.to_specialist,
      trigger: r.trigger,
      urgency: r.urgency ?? null,
      handoff_instruction: r.handoff_instruction ?? null,
      is_human_escalation: human,
    };
  });
  await sb.from('herne_referral_rules').upsert(rows, { onConflict: 'organisation_id,from_specialist,trigger,to_specialist' });
  const { count } = await sb.from('herne_referral_rules').select('id', { count: 'exact', head: true }).eq('organisation_id', HERNE_ORG);
  return { count: count ?? rows.length, humanEscalations };
}

export const referralRules = {
  async list(): Promise<ReferralRule[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('herne_referral_rules').select('*').eq('organisation_id', HERNE_ORG).order('from_specialist');
    return (data ?? []).map((r: Record<string, unknown>) => ({
      fromSpecialist: String(r.from_specialist),
      toSpecialist: String(r.to_specialist),
      trigger: String(r.trigger),
      urgency: (r.urgency as string | null) ?? null,
      handoffInstruction: (r.handoff_instruction as string | null) ?? null,
      isHumanEscalation: Boolean(r.is_human_escalation),
    }));
  },
};

export interface ReferralContext {
  summary?: string;
  objective?: string;
  recommendations?: string[];
  evidence?: string[];
  wearableSummary?: Record<string, unknown>;
  goals?: string[];
  consent?: string;
}

export interface ReferralResult {
  referralId: string | null;
  matchedRule: boolean;
  context: Record<string, unknown>;
}

export const referralEngine = {
  /** Refer a user from one specialist to another (or to a human), preserving full context. */
  async refer(input: {
    userId: string;
    fromSpecialist: string;
    toSpecialist: string;
    trigger: string;
    reason?: string;
    urgency?: string;
    context?: ReferralContext;
  }): Promise<ReferralResult> {
    const sb = createAdminClient();
    if (!sb) return { referralId: null, matchedRule: false, context: {} };

    const human = isHumanEscalation(input.toSpecialist);
    const plan = await carePlan.getOrCreate(input.userId);
    const rules = await referralRules.list();

    // Informational validation: is there a matrix rule that authorises this
    // handoff? Names are normalised to slugs and wildcards ('Any', 'Any
    // specialist', 'Relevant specialist') only match on their own side — a rule
    // must genuinely cover this from→to pair to count.
    const fromSlug = normalizeSpecialistRef(input.fromSpecialist);
    const toSlug = normalizeSpecialistRef(input.toSpecialist);
    const matchedRule = rules.some((r) => {
      const fromOk = isWildcardRef(r.fromSpecialist) || normalizeSpecialistRef(r.fromSpecialist) === fromSlug;
      const toOk = human
        ? r.isHumanEscalation
        : !r.isHumanEscalation && (isWildcardRef(r.toSpecialist) || normalizeSpecialistRef(r.toSpecialist) === toSlug);
      return fromOk && toOk;
    });

    // Dedupe: a still-open referral for the same from→to pair is returned, not
    // re-inserted (the live conversation path may detect the same handoff on
    // consecutive turns).
    const dupQuery = sb
      .from('herne_referrals')
      .select('id')
      .eq('user_id', input.userId)
      .eq('from_specialist', input.fromSpecialist)
      .eq('status', 'open')
      .limit(1);
    const { data: existing } = await (human ? dupQuery.eq('to_human_role', input.toSpecialist) : dupQuery.eq('to_specialist', input.toSpecialist));
    if (existing?.length) return { referralId: String(existing[0]!.id), matchedRule, context: {} };

    const fromName = herneProfile(input.fromSpecialist)?.name ?? input.fromSpecialist;
    const toName = human ? input.toSpecialist : herneProfile(input.toSpecialist)?.name ?? input.toSpecialist;

    // Preserve the full handoff context so nothing is lost.
    const context: Record<string, unknown> = {
      summary: input.context?.summary ?? `${fromName} referred this person to ${toName}.`,
      objective: input.context?.objective ?? null,
      recommendations: input.context?.recommendations ?? (plan ? (await carePlan.actions(plan.id)).map((a) => a.title) : []),
      evidence: input.context?.evidence ?? [],
      wearableSummary: input.context?.wearableSummary ?? plan?.wearableSummary ?? {},
      goals: input.context?.goals ?? plan?.goals ?? [],
      consent: input.context?.consent ?? 'not_recorded',
      referringSpecialist: input.fromSpecialist,
      receivingSpecialist: input.toSpecialist,
      urgency: input.urgency ?? 'Routine',
      reason: input.reason ?? input.trigger,
    };

    const { data } = await sb
      .from('herne_referrals')
      .insert({
        organisation_id: HERNE_ORG,
        care_plan_id: plan?.id ?? null,
        user_id: input.userId,
        from_specialist: input.fromSpecialist,
        to_specialist: human ? null : input.toSpecialist,
        to_human_role: human ? input.toSpecialist : null,
        trigger: input.trigger,
        reason: input.reason ?? input.trigger,
        urgency: input.urgency ?? 'Routine',
        context,
        status: 'open',
      })
      .select('id')
      .single();

    // Update the shared plan + timeline so the journey is continuous.
    if (plan && !human) await carePlan.assignSpecialist(plan.id, input.toSpecialist);
    await timeline.add(input.userId, {
      type: 'referral',
      title: human ? `Escalated to ${toName}` : `Handed over from ${fromName} to ${toName}`,
      detail: input.reason ?? input.trigger,
      specialist: input.fromSpecialist,
      ...(plan ? { carePlanId: plan.id } : {}),
    });

    return { referralId: data ? String(data.id) : null, matchedRule, context };
  },

  async listForUser(userId: string): Promise<Record<string, unknown>[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('herne_referrals').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data ?? []) as Record<string, unknown>[];
  },
};

export type EscalationTrigger = 'low_confidence' | 'outside_scope' | 'emergency' | 'human_review' | 'admin_support' | 'clinical_review';

export const escalationEngine = {
  async escalate(input: {
    userId?: string | null;
    carePlanId?: string | null;
    conversationId?: string | null;
    trigger: EscalationTrigger;
    reason: string;
    specialist?: string;
    destination?: string;
    urgency?: string;
  }): Promise<{ escalationId: string | null }> {
    const sb = createAdminClient();
    if (!sb) return { escalationId: null };
    const { data } = await sb
      .from('herne_escalations')
      .insert({
        organisation_id: HERNE_ORG,
        user_id: input.userId ?? null,
        care_plan_id: input.carePlanId ?? null,
        conversation_id: input.conversationId ?? null,
        trigger: input.trigger,
        reason: input.reason,
        specialist: input.specialist ?? null,
        destination: input.destination ?? 'Human clinical review',
        urgency: input.urgency ?? 'Prompt',
      })
      .select('id')
      .single();
    if (input.userId) {
      await timeline.add(input.userId, {
        type: 'specialist_review',
        title: `Escalation: ${input.destination ?? 'Human clinical review'}`,
        detail: input.reason,
        specialist: input.specialist ?? 'system',
        ...(input.carePlanId ? { carePlanId: input.carePlanId } : {}),
      });
    }
    return { escalationId: data ? String(data.id) : null };
  },

  async listForUser(userId: string): Promise<Record<string, unknown>[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('herne_escalations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data ?? []) as Record<string, unknown>[];
  },
};
