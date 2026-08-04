import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Real consultation workflow over consultations + consultation_events (migration
 * 0007). The admin pages read cases, timelines and notes from here; notes append
 * as immutable events; approve / request-changes are guarded status transitions.
 * Fictional demo cases seed idempotently onto the demo accounts.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

export interface ConsultationCase {
  id: string;
  memberId: string;
  memberName: string;
  practitionerId: string | null;
  practitionerName: string;
  status: string;
  stage: string;
  reason: string;
  aiReview: string | null;
  practitionerNotes: string | null;
  summary: string | null;
  startedAt: string | null;
  updatedAt: string;
}

export interface ConsultationEvent {
  id: string;
  stage: string;
  title: string;
  actorName: string;
  detail: string | null;
  createdAt: string;
}

let seeded = false;

async function names(sb: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;
  const { data } = await sb.from('profiles').select('id, full_name, email').in('id', unique);
  for (const p of data ?? []) map.set(String(p.id), String(p.full_name || p.email || 'User'));
  return map;
}

/** Seed three fictional demo cases (idempotent — only when the table is empty). */
async function ensureSeed(sb: SupabaseClient): Promise<void> {
  if (seeded) return;
  const { count, error } = await sb.from('consultations').select('id', { count: 'exact', head: true }).eq('organisation_id', ORG);
  if (error) return;
  if ((count ?? 0) === 0) {
    const { data: users } = await sb.from('profiles').select('id, email, role').in('role', ['member', 'practitioner']);
    const members = (users ?? []).filter((u) => u.role === 'member').slice(0, 2);
    const practitioner = (users ?? []).find((u) => u.role === 'practitioner');
    for (const [i, m] of members.entries()) {
      const { data: c } = await sb
        .from('consultations')
        .insert({
          organisation_id: ORG,
          member_id: m.id,
          practitioner_id: i === 0 ? practitioner?.id ?? null : null,
          status: i === 0 ? 'awaiting_review' : 'in_progress',
          reason: i === 0 ? 'Wellbeing review requested after intake' : 'General enquiry from intake',
          ai_review: 'AI summary drafted from the intake conversation. (Fictional demonstration data.)',
          started_at: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(),
        })
        .select('id')
        .single();
      if (c?.id) {
        await sb.from('consultation_events').insert([
          { consultation_id: c.id, stage: 'intake', title: 'Intake completed', data: {} },
          { consultation_id: c.id, stage: 'ai_review', title: 'AI review drafted', data: {} },
        ]);
      }
    }
  }
  seeded = true;
}

export const consultationsRepo = {
  async list(): Promise<ConsultationCase[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    await ensureSeed(sb);
    const { data } = await sb
      .from('consultations')
      .select('*')
      .eq('organisation_id', ORG)
      .order('updated_at', { ascending: false })
      .limit(50);
    const rows = data ?? [];
    const nameMap = await names(
      sb,
      rows.flatMap((r) => [String(r.member_id), r.practitioner_id ? String(r.practitioner_id) : '']),
    );
    // Latest event stage per consultation — newest first, and when timestamps
    // tie (batch inserts) the further-along stage wins.
    const STAGE_ORDER = ['intake', 'assessment', 'ai_review', 'practitioner_review', 'appointment', 'follow_up', 'history'];
    const ids = rows.map((r) => String(r.id));
    const stages = new Map<string, { stage: string; at: string }>();
    if (ids.length) {
      const { data: events } = await sb
        .from('consultation_events')
        .select('consultation_id, stage, created_at')
        .in('consultation_id', ids);
      for (const e of events ?? []) {
        const key = String(e.consultation_id);
        const stage = String(e.stage);
        const at = String(e.created_at);
        const cur = stages.get(key);
        if (!cur || at > cur.at || (at === cur.at && STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(cur.stage))) {
          stages.set(key, { stage, at });
        }
      }
    }
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      memberId: String(r.member_id),
      memberName: nameMap.get(String(r.member_id)) ?? 'Member',
      practitionerId: (r.practitioner_id as string | null) ?? null,
      practitionerName: r.practitioner_id ? nameMap.get(String(r.practitioner_id)) ?? 'Practitioner' : 'Unassigned',
      status: String(r.status ?? 'scheduled'),
      stage: stages.get(String(r.id))?.stage ?? 'intake',
      reason: String(r.reason ?? ''),
      aiReview: (r.ai_review as string | null) ?? null,
      practitionerNotes: (r.practitioner_notes as string | null) ?? null,
      summary: (r.summary as string | null) ?? null,
      startedAt: (r.started_at as string | null) ?? null,
      updatedAt: String(r.updated_at),
    }));
  },

  async byId(id: string): Promise<{ consultation: ConsultationCase; events: ConsultationEvent[] } | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data: r } = await sb.from('consultations').select('*').eq('id', id).maybeSingle();
    if (!r) return null;
    const { data: eventRows } = await sb
      .from('consultation_events')
      .select('*')
      .eq('consultation_id', id)
      .order('created_at', { ascending: true });
    const actorIds = (eventRows ?? []).map((e) => (e.actor_id ? String(e.actor_id) : ''));
    const nameMap = await names(sb, [String(r.member_id), r.practitioner_id ? String(r.practitioner_id) : '', ...actorIds]);
    const events: ConsultationEvent[] = (eventRows ?? []).map((e: Record<string, unknown>) => ({
      id: String(e.id),
      stage: String(e.stage),
      title: String(e.title),
      actorName: e.actor_id ? nameMap.get(String(e.actor_id)) ?? 'Team' : 'System',
      detail: ((e.data as Record<string, unknown> | null)?.text as string | undefined) ?? null,
      createdAt: String(e.created_at),
    }));
    const latestStage = events.length ? events[events.length - 1]!.stage : 'intake';
    return {
      consultation: {
        id: String(r.id),
        memberId: String(r.member_id),
        memberName: nameMap.get(String(r.member_id)) ?? 'Member',
        practitionerId: (r.practitioner_id as string | null) ?? null,
        practitionerName: r.practitioner_id ? nameMap.get(String(r.practitioner_id)) ?? 'Practitioner' : 'Unassigned',
        status: String(r.status ?? 'scheduled'),
        stage: latestStage,
        reason: String(r.reason ?? ''),
        aiReview: (r.ai_review as string | null) ?? null,
        practitionerNotes: (r.practitioner_notes as string | null) ?? null,
        summary: (r.summary as string | null) ?? null,
        startedAt: (r.started_at as string | null) ?? null,
        updatedAt: String(r.updated_at),
      },
      events,
    };
  },

  /** Append an immutable note event. */
  async addNote(consultationId: string, actorId: string, text: string): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { error } = await sb.from('consultation_events').insert({
      consultation_id: consultationId,
      stage: 'practitioner_review',
      actor_id: actorId,
      title: 'Note added',
      data: { text },
    });
    if (!error) await sb.from('consultations').update({ updated_at: new Date().toISOString() }).eq('id', consultationId);
    return !error;
  },

  /** Guarded review transitions: approve → completed; changes → awaiting_review. */
  async review(consultationId: string, actorId: string, decision: 'approve' | 'request_changes'): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const status = decision === 'approve' ? 'completed' : 'awaiting_review';
    const { data, error } = await sb
      .from('consultations')
      .update({ status, updated_at: new Date().toISOString(), ...(decision === 'approve' ? { ended_at: new Date().toISOString() } : {}) })
      .eq('id', consultationId)
      .in('status', ['awaiting_review', 'in_progress', 'scheduled'])
      .select('id')
      .maybeSingle();
    if (error || !data) return false;
    await sb.from('consultation_events').insert({
      consultation_id: consultationId,
      stage: 'practitioner_review',
      actor_id: actorId,
      title: decision === 'approve' ? 'Review approved' : 'Changes requested',
      data: {},
    });
    return true;
  },
};
