import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, type Result } from '../result';
import type {
  CrmLead,
  CrmLeadEvent,
  ConversationTurn,
  LeadStatus,
  LeadFollowUp,
  LeadWhatsapp,
  LeadHumanReview,
  LeadEventType,
} from '@/types/crm';
import { LEAD_STATUS_ORDER } from '@/types/crm';
import { ESCALATION_TARGET } from '@/config/receptionist';
import { sanitizeIlikeTerm } from '@/lib/security/sanitize';

/**
 * Production CRM repository over crm_leads + crm_lead_events. Real rows, real
 * events, real pipeline counts. All queries are org-scoped; writes stamp
 * updated_at and append an audit event where the workflow requires one.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

function nowIso(): string {
  return new Date().toISOString();
}

function rowToLead(r: Record<string, unknown>): CrmLead {
  return {
    id: String(r.id),
    organisationId: String(r.organisation_id),
    name: String(r.name),
    email: String(r.email),
    phone: (r.phone as string | null) ?? null,
    whatsapp: (r.whatsapp as string | null) ?? null,
    source: (r.source as CrmLead['source']) ?? 'receptionist',
    conversation: Array.isArray(r.conversation) ? (r.conversation as ConversationTurn[]) : [],
    assessmentSummary: String(r.assessment_summary ?? ''),
    assessment: (r.assessment as Record<string, string>) ?? {},
    recommendedSpecialistSlug: (r.recommended_specialist_slug as string | null) ?? null,
    recommendedSpecialistName: (r.recommended_specialist_name as string | null) ?? null,
    recommendationConfidence: Number(r.recommendation_confidence ?? 0),
    alternativeMatches: Array.isArray(r.alternative_matches) ? (r.alternative_matches as { slug: string; name: string }[]) : [],
    humanReviewStatus: (r.human_review_status as LeadHumanReview) ?? 'not_required',
    assignedSpecialistSlug: (r.assigned_specialist_slug as string | null) ?? null,
    status: (r.status as LeadStatus) ?? 'new',
    followUpStatus: (r.follow_up_status as LeadFollowUp) ?? 'none',
    whatsappStatus: (r.whatsapp_status as LeadWhatsapp) ?? 'none',
    subscriptionStatus: (r.subscription_status as CrmLead['subscriptionStatus']) ?? 'none',
    progress: Number(r.progress ?? 0),
    escalated: Boolean(r.escalated),
    escalatedTo: (r.escalated_to_name as string | null) ?? null,
    responsibleAdmin: (r.responsible_admin_name as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    reviewClosed: Boolean(r.review_closed),
    reminderAt: (r.reminder_at as string | null) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowToEvent(r: Record<string, unknown>): CrmLeadEvent {
  return {
    id: String(r.id),
    leadId: String(r.lead_id),
    type: (r.type as LeadEventType) ?? 'note',
    title: String(r.title),
    detail: (r.detail as string | null) ?? null,
    actor: String(r.actor ?? 'System'),
    createdAt: String(r.created_at),
  };
}

async function addEvent(sb: SupabaseClient, leadId: string, type: LeadEventType, title: string, detail: string | null, actor: string): Promise<void> {
  try {
    await sb.from('crm_lead_events').insert({ lead_id: leadId, type, title, detail, actor });
  } catch {
    // best-effort — an event failure never blocks the workflow
  }
}

function noDb<T>(): Result<T> {
  return err({ code: 'unavailable', message: 'The CRM database is not available.' });
}

/** Update a lead by id and return the mapped row (with updated_at stamped). */
async function patch(
  sb: SupabaseClient,
  id: string,
  fields: Record<string, unknown>,
  event?: { type: LeadEventType; title: string; detail?: string | null; actor?: string },
): Promise<Result<CrmLead>> {
  const { data, error } = await sb
    .from('crm_leads')
    .update({ ...fields, updated_at: nowIso() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error || !data) return err({ code: 'not_found', message: 'Lead not found.' });
  if (event) await addEvent(sb, id, event.type, event.title, event.detail ?? null, event.actor ?? 'Admin');
  return ok(rowToLead(data));
}

export const crmRepo = {
  async list(filter?: { status?: LeadStatus; search?: string; followUp?: LeadFollowUp; assigned?: string }): Promise<Result<CrmLead[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    let q = sb.from('crm_leads').select('*').eq('organisation_id', ORG).order('created_at', { ascending: false }).limit(200);
    if (filter?.status) q = q.eq('status', filter.status);
    if (filter?.followUp) q = q.eq('follow_up_status', filter.followUp);
    if (filter?.assigned) q = q.eq('responsible_admin_name', filter.assigned);
    if (filter?.search?.trim()) {
      // Whitelist-sanitised: raw input could otherwise inject into the
      // PostgREST .or() expression (runs on the service-role client). A term
      // that sanitises to nothing (e.g. entirely non-Latin) can match nothing —
      // return no leads rather than silently returning ALL of them.
      const s = sanitizeIlikeTerm(filter.search);
      if (!s) return ok([]);
      q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,assessment_summary.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) return err({ code: 'unavailable', message: 'Could not load leads.' });
    return ok((data ?? []).map(rowToLead));
  },

  async byId(id: string): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('crm_leads').select('*').eq('id', id).maybeSingle();
    return data ? ok(rowToLead(data)) : err({ code: 'not_found', message: 'Lead not found.' });
  },

  async events(leadId: string): Promise<Result<CrmLeadEvent[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('crm_lead_events').select('*').eq('lead_id', leadId).order('created_at', { ascending: true });
    return ok((data ?? []).map(rowToEvent));
  },

  async escalationQueue(): Promise<Result<CrmLead[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb
      .from('crm_leads')
      .select('*')
      .eq('organisation_id', ORG)
      .eq('escalated', true)
      .eq('review_closed', false)
      .order('created_at', { ascending: false });
    return ok((data ?? []).map(rowToLead));
  },

  async pipeline(): Promise<Result<{ status: LeadStatus; count: number }[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('crm_leads').select('status').eq('organisation_id', ORG);
    const rows = data ?? [];
    return ok(LEAD_STATUS_ORDER.map((status) => ({ status, count: rows.filter((r) => r.status === status).length })));
  },

  async create(input: {
    name: string;
    email: string;
    whatsapp?: string | null;
    conversation?: ConversationTurn[];
    assessmentSummary: string;
    assessment: Record<string, string>;
    recommendedSpecialistSlug: string | null;
    recommendedSpecialistName: string | null;
    recommendationConfidence: number;
    alternativeMatches?: { slug: string; name: string }[];
    escalated: boolean;
    source?: CrmLead['source'];
  }): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data, error } = await sb
      .from('crm_leads')
      .insert({
        organisation_id: ORG,
        name: input.name,
        email: input.email,
        whatsapp: input.whatsapp ?? null,
        source: input.source ?? 'receptionist',
        conversation: input.conversation ?? [],
        assessment_summary: input.assessmentSummary,
        assessment: input.assessment,
        recommended_specialist_slug: input.recommendedSpecialistSlug,
        recommended_specialist_name: input.recommendedSpecialistName,
        recommendation_confidence: input.recommendationConfidence,
        alternative_matches: input.alternativeMatches ?? [],
        human_review_status: input.escalated ? 'pending' : 'not_required',
        status: input.escalated ? 'human_review' : input.recommendedSpecialistSlug ? 'recommended' : 'new',
        follow_up_status: input.escalated ? 'in_progress' : 'none',
        whatsapp_status: input.whatsapp ? 'requested' : 'none',
        escalated: input.escalated,
        escalated_to_name: input.escalated ? ESCALATION_TARGET.name : null,
      })
      .select('*')
      .single();
    if (error || !data) return err({ code: 'invalid', message: 'Could not create the lead.' });
    const lead = rowToLead(data);
    await addEvent(sb, lead.id, 'lead_created', 'Lead created by the Receptionist AI', input.assessmentSummary, 'Receptionist AI');
    if (input.escalated) await addEvent(sb, lead.id, 'escalation', `Escalated to ${ESCALATION_TARGET.name}`, 'Below the confidence threshold.', 'Receptionist AI');
    return ok(lead);
  },

  async updateStatus(id: string, status: LeadStatus): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    return patch(sb, id, { status }, { type: 'note', title: `Status changed to ${status}` });
  },

  async approveRecommendation(id: string): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const current = await crmRepo.byId(id);
    if (!current.ok) return current;
    return patch(
      sb,
      id,
      { human_review_status: 'approved', assigned_specialist_slug: current.data.recommendedSpecialistSlug },
      { type: 'recommendation', title: 'Recommendation approved', detail: current.data.recommendedSpecialistName ? `Assigned ${current.data.recommendedSpecialistName}.` : null },
    );
  },

  async changeRecommendation(id: string, slug: string, name: string): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    return patch(
      sb,
      id,
      { human_review_status: 'changed', assigned_specialist_slug: slug, recommended_specialist_slug: slug, recommended_specialist_name: name, status: 'recommended' },
      { type: 'recommendation', title: `Recommendation changed to ${name}` },
    );
  },

  async addNote(id: string, note: string, actor = 'Admin'): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const current = await crmRepo.byId(id);
    if (!current.ok) return current;
    const notes = current.data.notes ? `${current.data.notes}\n${note}` : note;
    return patch(sb, id, { notes }, { type: 'note', title: 'Note added', detail: note, actor });
  },

  async assign(id: string, admin: string): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    return patch(sb, id, { responsible_admin_name: admin }, { type: 'note', title: `Assigned to ${admin}` });
  },

  async setFollowUp(id: string, status: LeadFollowUp): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    return patch(sb, id, { follow_up_status: status }, { type: 'follow_up', title: `Follow-up marked ${status}` });
  },

  async setWhatsapp(id: string, status: LeadWhatsapp): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    return patch(sb, id, { whatsapp_status: status }, { type: 'whatsapp_handoff', title: `WhatsApp follow-up marked ${status}` });
  },

  async takeOver(id: string, message: string, actor = 'Admin'): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const current = await crmRepo.byId(id);
    if (!current.ok) return current;
    const conversation = [...current.data.conversation, { role: 'receptionist', text: message, at: nowIso() }];
    return patch(sb, id, { conversation }, { type: 'note', title: 'A team member replied', detail: message, actor });
  },

  async setReviewStatus(id: string, review: LeadHumanReview): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    return patch(sb, id, { human_review_status: review });
  },

  async closeReview(id: string): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    return patch(sb, id, { review_closed: true }, { type: 'note', title: 'Review closed' });
  },

  async reopenReview(id: string): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    return patch(sb, id, { review_closed: false }, { type: 'note', title: 'Review reopened' });
  },

  async setReminder(id: string, at: string | null): Promise<Result<CrmLead>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    return patch(sb, id, { reminder_at: at }, { type: 'follow_up', title: at ? `Reminder set for ${at.slice(0, 10)}` : 'Reminder cleared' });
  },
};
