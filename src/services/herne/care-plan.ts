import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from './records';
import { canTransition, NON_TERMINAL_STATUSES, type ActionStatus } from './care-plan-states';

/**
 * The ONE shared HERNE care plan per user — every specialist reads and updates
 * the same plan and timeline, so the user never starts over. Recommendations are
 * de-duplicated (no two specialists file the same action), and the plan is the
 * substrate the referral + escalation engines and the user dashboard read.
 */

export interface CarePlan {
  id: string;
  userId: string;
  status: string;
  goals: string[];
  concerns: string[];
  hernePriorities: string[];
  assignedSpecialists: string[];
  wearableSummary: Record<string, unknown>;
  reviewDates: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CarePlanAction {
  id: string;
  carePlanId: string;
  specialist: string;
  kind: string;
  title: string;
  detail: string | null;
  status: string;
  evidenceRefs: string[];
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  userId: string;
  type: string;
  title: string;
  detail: string | null;
  specialist: string | null;
  createdAt: string;
}

type Row = Record<string, unknown>;
const nowIso = () => new Date().toISOString();

function rowToPlan(r: Row): CarePlan {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    status: String(r.status),
    goals: (r.goals as string[]) ?? [],
    concerns: (r.concerns as string[]) ?? [],
    hernePriorities: (r.herne_priorities as string[]) ?? [],
    assignedSpecialists: (r.assigned_specialists as string[]) ?? [],
    wearableSummary: (r.wearable_summary as Record<string, unknown>) ?? {},
    reviewDates: (r.review_dates as string[]) ?? [],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export const timeline = {
  async add(
    userId: string,
    event: { type: string; title: string; detail?: string; specialist?: string; carePlanId?: string },
    sb?: SupabaseClient,
  ): Promise<void> {
    const client = sb ?? createAdminClient();
    if (!client) return;
    await client.from('herne_timeline_events').insert({
      organisation_id: HERNE_ORG,
      user_id: userId,
      care_plan_id: event.carePlanId ?? null,
      type: event.type,
      title: event.title,
      detail: event.detail ?? null,
      specialist: event.specialist ?? null,
    });
  },

  async list(userId: string, limit = 50): Promise<TimelineEvent[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb
      .from('herne_timeline_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      userId: String(r.user_id),
      type: String(r.type),
      title: String(r.title),
      detail: (r.detail as string | null) ?? null,
      specialist: (r.specialist as string | null) ?? null,
      createdAt: String(r.created_at),
    }));
  },
};

export const carePlan = {
  async get(userId: string): Promise<CarePlan | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data } = await sb.from('herne_care_plans').select('*').eq('user_id', userId).eq('status', 'active').maybeSingle();
    return data ? rowToPlan(data) : null;
  },

  async getOrCreate(userId: string): Promise<CarePlan | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const existing = await sb.from('herne_care_plans').select('*').eq('user_id', userId).eq('status', 'active').maybeSingle();
    if (existing.data) return rowToPlan(existing.data);
    const { data } = await sb
      .from('herne_care_plans')
      .insert({ organisation_id: HERNE_ORG, user_id: userId, status: 'active' })
      .select('*')
      .single();
    if (!data) return null;
    const plan = rowToPlan(data);
    await timeline.add(userId, { type: 'registration', title: 'Wellbeing care plan created', carePlanId: plan.id, specialist: 'makela' }, sb);
    return plan;
  },

  async actions(carePlanId: string): Promise<CarePlanAction[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('herne_care_plan_actions').select('*').eq('care_plan_id', carePlanId).order('created_at', { ascending: false });
    return (data ?? []).map((r: Row) => ({
      id: String(r.id),
      carePlanId: String(r.care_plan_id),
      specialist: String(r.specialist),
      kind: String(r.kind),
      title: String(r.title),
      detail: (r.detail as string | null) ?? null,
      status: String(r.status),
      evidenceRefs: (r.evidence_refs as string[]) ?? [],
      createdAt: String(r.created_at),
    }));
  },

  /**
   * Propose an action, de-duplicated by (specialist, title) across NON-TERMINAL
   * states only — a previously declined/superseded recommendation can be re-raised,
   * but two live copies cannot coexist (also backed by a DB partial-unique index).
   * New actions start in 'proposed'; the person accepts or declines them.
   */
  async addAction(
    carePlanId: string,
    input: { specialist: string; title: string; detail?: string; kind?: string; status?: string; evidenceRefs?: string[] },
  ): Promise<{ added: boolean; action: CarePlanAction | null }> {
    const sb = createAdminClient();
    if (!sb) return { added: false, action: null };
    const dupe = await sb
      .from('herne_care_plan_actions')
      .select('id')
      .eq('care_plan_id', carePlanId)
      .eq('specialist', input.specialist)
      .ilike('title', input.title)
      .in('status', NON_TERMINAL_STATUSES)
      .maybeSingle();
    if (dupe.data) return { added: false, action: null };
    const { data, error } = await sb
      .from('herne_care_plan_actions')
      .insert({
        care_plan_id: carePlanId,
        specialist: input.specialist,
        kind: input.kind ?? 'recommendation',
        title: input.title,
        detail: input.detail ?? null,
        status: input.status ?? 'proposed',
        proposed_by: input.specialist,
        evidence_refs: input.evidenceRefs ?? [],
      })
      .select('*')
      .single();
    // A concurrent insert may hit the partial-unique index — treat as a dedup, not an error.
    if (error || !data) return { added: false, action: null };
    return {
      added: true,
      action: {
        id: String(data.id),
        carePlanId,
        specialist: input.specialist,
        kind: String(data.kind),
        title: input.title,
        detail: input.detail ?? null,
        status: String(data.status),
        evidenceRefs: input.evidenceRefs ?? [],
        createdAt: String(data.created_at),
      },
    };
  },

  /** Fetch a single action (with its plan's owner) — used for authorising transitions. */
  async actionWithOwner(actionId: string): Promise<{ action: CarePlanAction; userId: string } | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data } = await sb.from('herne_care_plan_actions').select('*, herne_care_plans!inner(user_id)').eq('id', actionId).maybeSingle();
    if (!data) return null;
    const owner = (data as Row).herne_care_plans as { user_id?: string } | null;
    return {
      userId: String(owner?.user_id ?? ''),
      action: {
        id: String(data.id), carePlanId: String(data.care_plan_id), specialist: String(data.specialist),
        kind: String(data.kind), title: String(data.title), detail: (data.detail as string | null) ?? null,
        status: String(data.status), evidenceRefs: (data.evidence_refs as string[]) ?? [], createdAt: String(data.created_at),
      },
    };
  },

  /**
   * Guarded state transition. Reads the current status, verifies the edge is legal,
   * writes the new status + metadata, and logs a timeline event. Returns false when
   * the action is missing or the transition is illegal (never force-transitions).
   */
  async transition(actionId: string, to: ActionStatus, opts?: { userId?: string; reason?: string; supersededBy?: string }): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { data: cur } = await sb.from('herne_care_plan_actions').select('status, care_plan_id, specialist, title').eq('id', actionId).maybeSingle();
    if (!cur) return false;
    const from = String(cur.status) as ActionStatus;
    if (!canTransition(from, to)) return false;

    const patch: Record<string, unknown> = { status: to, updated_at: nowIso() };
    if (to === 'user_accepted') patch.accepted_at = nowIso();
    if (to === 'declined') { patch.declined_at = nowIso(); if (opts?.reason) patch.declined_reason = opts.reason; }
    if (to === 'requires_human_review' && opts?.reason) patch.review_reason = opts.reason;
    if (to === 'superseded' && opts?.supersededBy) patch.superseded_by = opts.supersededBy;

    // Guard on the observed status so a concurrent change can't be clobbered.
    const { data, error } = await sb.from('herne_care_plan_actions').update(patch).eq('id', actionId).eq('status', from).select('id').maybeSingle();
    if (error || !data) return false;

    if (opts?.userId) {
      await timeline.add(opts.userId, {
        type: 'care_plan',
        title: `Action ${to.replace(/_/g, ' ')}: ${String(cur.title)}`,
        ...(opts?.reason ? { detail: opts.reason } : {}),
        specialist: String(cur.specialist),
        carePlanId: String(cur.care_plan_id),
      });
    }
    return true;
  },

  acceptAction(actionId: string, userId?: string): Promise<boolean> {
    return carePlan.transition(actionId, 'user_accepted', userId ? { userId } : {});
  },
  declineAction(actionId: string, reason?: string, userId?: string): Promise<boolean> {
    return carePlan.transition(actionId, 'declined', { ...(reason ? { reason } : {}), ...(userId ? { userId } : {}) });
  },
  activateAction(actionId: string, userId?: string): Promise<boolean> {
    return carePlan.transition(actionId, 'active', userId ? { userId } : {});
  },
  supersedeAction(actionId: string, supersededBy: string, userId?: string): Promise<boolean> {
    return carePlan.transition(actionId, 'superseded', { supersededBy, ...(userId ? { userId } : {}) });
  },
  flagForHumanReview(actionId: string, reason?: string, userId?: string): Promise<boolean> {
    return carePlan.transition(actionId, 'requires_human_review', { ...(reason ? { reason } : {}), ...(userId ? { userId } : {}) });
  },

  async completeAction(actionId: string, userId?: string): Promise<boolean> {
    // Guarded: only active actions may complete (accept → activate → complete).
    return carePlan.transition(actionId, 'completed', userId ? { userId } : {});
  },

  /** Ensure a specialist is recorded as contributing to the plan. */
  async assignSpecialist(carePlanId: string, specialist: string): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    const { data } = await sb.from('herne_care_plans').select('assigned_specialists').eq('id', carePlanId).maybeSingle();
    const current = (data?.assigned_specialists as string[] | null) ?? [];
    if (current.includes(specialist)) return;
    await sb.from('herne_care_plans').update({ assigned_specialists: [...current, specialist], updated_at: nowIso() }).eq('id', carePlanId);
  },

  async setGoals(carePlanId: string, goals: string[]): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    await sb.from('herne_care_plans').update({ goals, updated_at: nowIso() }).eq('id', carePlanId);
  },

  async addConcern(carePlanId: string, concern: string): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    const { data } = await sb.from('herne_care_plans').select('concerns').eq('id', carePlanId).maybeSingle();
    const current = (data?.concerns as string[] | null) ?? [];
    if (current.includes(concern)) return;
    await sb.from('herne_care_plans').update({ concerns: [...current, concern], updated_at: nowIso() }).eq('id', carePlanId);
  },
};
