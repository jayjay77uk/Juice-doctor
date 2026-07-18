import 'server-only';

import type {
  CrmLead,
  CrmLeadEvent,
  LeadStatus,
  LeadFollowUp,
  LeadWhatsapp,
  LeadHumanReview,
  ConversationTurn,
} from '@/types/crm';
import { LEAD_STATUS_ORDER } from '@/types/crm';
import { ESCALATION_TARGET } from '@/config/receptionist';
import { ok, err, type Result } from './result';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { crmRepo } from './repositories/crm-repo';

/**
 * AI-centric CRM — the operational core. Every lead is created by the
 * Receptionist AI and records the full conversation, the consultation summary,
 * the recommendation + confidence, alternative matches, the assigned specialist,
 * human-review / WhatsApp / subscription / follow-up status, progress, notes, a
 * responsible team member and an activity timeline.
 *
 * PRODUCTION: when Supabase is configured, every method delegates to crmRepo
 * (crm_leads + crm_lead_events — real rows, real events, migration 0015+0026).
 * The in-process store below remains ONLY as the local preview fallback.
 */

const ORG = '00000000-0000-0000-0000-000000000001';
let leadCounter = 0;
let eventCounter = 0;

function nowIso(): string {
  return new Date().toISOString();
}

const convo1: ConversationTurn[] = [
  { role: 'receptionist', text: 'Hello, and welcome. What would you like help with today?', at: '2026-07-06T09:12:00.000Z' },
  { role: 'visitor', text: 'I would like to understand which service is right for me.', at: '2026-07-06T09:12:30.000Z' },
  { role: 'receptionist', text: 'Thank you. What outcome are you hoping for?', at: '2026-07-06T09:12:45.000Z' },
  { role: 'visitor', text: 'A clear plan and someone to guide me through it.', at: '2026-07-06T09:13:10.000Z' },
];

const convo2: ConversationTurn[] = [
  { role: 'receptionist', text: 'Hello, and welcome. What would you like help with today?', at: '2026-07-10T08:40:00.000Z' },
  { role: 'visitor', text: 'Not sure yet — I have a few different questions.', at: '2026-07-10T08:40:40.000Z' },
];

const leads: CrmLead[] = [
  {
    id: 'lead_1', organisationId: ORG, name: 'Customer A', email: 'customer.a@example.com', phone: null, whatsapp: '+44 7700 900001',
    source: 'receptionist', conversation: convo1,
    assessmentSummary: 'The visitor wanted help choosing the right service and a clear plan to follow. The receptionist suggested Makela.',
    assessment: { 'What would you like help with today?': 'Choosing the right service.', 'What outcome are you hoping for?': 'A clear plan and guidance.' },
    recommendedSpecialistSlug: 'makela', recommendedSpecialistName: 'Makela', recommendationConfidence: 0.72,
    alternativeMatches: [{ slug: 'serena', name: 'Serena' }],
    humanReviewStatus: 'not_required', assignedSpecialistSlug: 'makela', status: 'active',
    followUpStatus: 'scheduled', whatsappStatus: 'connected', subscriptionStatus: 'active', progress: 40,
    escalated: false, escalatedTo: null, responsibleAdmin: null, notes: null, reviewClosed: false, reminderAt: null,
    createdAt: '2026-07-06T09:12:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z',
  },
  {
    id: 'lead_2', organisationId: ORG, name: 'Customer B', email: 'customer.b@example.com', phone: null, whatsapp: '+44 7700 900002',
    source: 'receptionist', conversation: convo2,
    assessmentSummary: 'The visitor had several questions and was unsure what they needed. The receptionist was not confident enough to recommend an AI, so the lead was marked for human review.',
    assessment: { 'What would you like help with today?': 'A few different questions.' },
    recommendedSpecialistSlug: null, recommendedSpecialistName: null, recommendationConfidence: 0.34,
    alternativeMatches: [{ slug: 'makela', name: 'Makela' }, { slug: 'aqua', name: 'Aqua' }],
    humanReviewStatus: 'pending', assignedSpecialistSlug: null, status: 'human_review',
    followUpStatus: 'in_progress', whatsappStatus: 'requested', subscriptionStatus: 'none', progress: 0,
    escalated: true, escalatedTo: ESCALATION_TARGET.name, responsibleAdmin: null, notes: null, reviewClosed: false, reminderAt: '2026-07-12T09:00:00.000Z',
    createdAt: '2026-07-10T08:40:00.000Z', updatedAt: '2026-07-10T09:00:00.000Z',
  },
  {
    id: 'lead_3', organisationId: ORG, name: 'Customer C', email: 'customer.c@example.com', phone: null, whatsapp: null,
    source: 'website', conversation: [],
    assessmentSummary: 'The visitor described a specific need and a clear timeframe. The receptionist suggested Aqua.',
    assessment: { 'What would you like help with today?': 'A specific, time-sensitive need.', 'What outcome are you hoping for?': 'To get started this month.' },
    recommendedSpecialistSlug: 'aqua', recommendedSpecialistName: 'Aqua', recommendationConfidence: 0.7,
    alternativeMatches: [{ slug: 'sage', name: 'Sage' }],
    humanReviewStatus: 'not_required', assignedSpecialistSlug: null, status: 'recommended',
    followUpStatus: 'none', whatsappStatus: 'none', subscriptionStatus: 'none', progress: 0,
    escalated: false, escalatedTo: null, responsibleAdmin: null, notes: null, reviewClosed: false, reminderAt: null,
    createdAt: '2026-07-09T14:20:00.000Z', updatedAt: '2026-07-09T14:20:00.000Z',
  },
  {
    id: 'lead_4', organisationId: ORG, name: 'Customer D', email: 'customer.d@example.com', phone: '+44 7700 900004', whatsapp: null,
    source: 'referral', conversation: [],
    assessmentSummary: 'A referred visitor who knew what they wanted. The receptionist suggested Serena and a human approved the recommendation.',
    assessment: { 'What would you like help with today?': 'Referred by an existing customer.' },
    recommendedSpecialistSlug: 'serena', recommendedSpecialistName: 'Serena', recommendationConfidence: 0.68,
    alternativeMatches: [], humanReviewStatus: 'approved', assignedSpecialistSlug: 'serena', status: 'active',
    followUpStatus: 'done', whatsappStatus: 'connected', subscriptionStatus: 'active', progress: 65,
    escalated: false, escalatedTo: null, responsibleAdmin: 'Admin', notes: 'Approved after a quick review.', reviewClosed: true, reminderAt: null,
    createdAt: '2026-07-04T11:05:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z',
  },
];

const events: CrmLeadEvent[] = [
  { id: 'ev_1', leadId: 'lead_1', type: 'consultation', title: 'Receptionist consultation completed', detail: null, actor: 'Receptionist AI', createdAt: '2026-07-06T09:12:00.000Z' },
  { id: 'ev_2', leadId: 'lead_1', type: 'recommendation', title: 'Recommended Makela', detail: 'Confidence 72%.', actor: 'Receptionist AI', createdAt: '2026-07-06T09:13:00.000Z' },
  { id: 'ev_3', leadId: 'lead_1', type: 'subscription', title: 'Subscribed to Makela', detail: null, actor: 'Customer A', createdAt: '2026-07-06T09:20:00.000Z' },
  { id: 'ev_4', leadId: 'lead_2', type: 'consultation', title: 'Receptionist consultation completed', detail: null, actor: 'Receptionist AI', createdAt: '2026-07-10T08:40:00.000Z' },
  { id: 'ev_5', leadId: 'lead_2', type: 'escalation', title: `Escalated to ${ESCALATION_TARGET.name}`, detail: 'Below the confidence threshold.', actor: 'Receptionist AI', createdAt: '2026-07-10T08:41:00.000Z' },
];

const STATUSES: LeadStatus[] = LEAD_STATUS_ORDER;

function addEvent(leadId: string, type: CrmLeadEvent['type'], title: string, detail: string | null, actor: string): void {
  events.push({ id: `ev_new_${++eventCounter}`, leadId, type, title, detail, actor, createdAt: nowIso() });
}

function find(id: string): CrmLead | undefined {
  return leads.find((l) => l.id === id);
}

const mockCrm = {
  async list(filter?: { status?: LeadStatus; search?: string; followUp?: LeadFollowUp; assigned?: string }): Promise<Result<CrmLead[]>> {
    let rows = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter?.status) rows = rows.filter((l) => l.status === filter.status);
    if (filter?.followUp) rows = rows.filter((l) => l.followUpStatus === filter.followUp);
    if (filter?.assigned) rows = rows.filter((l) => l.responsibleAdmin === filter.assigned);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      rows = rows.filter((l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.assessmentSummary.toLowerCase().includes(q));
    }
    return ok(rows);
  },
  async byId(id: string): Promise<Result<CrmLead>> {
    const match = find(id);
    return match ? ok(match) : err({ code: 'not_found', message: 'Lead not found.' });
  },
  async events(leadId: string): Promise<Result<CrmLeadEvent[]>> {
    return ok(events.filter((e) => e.leadId === leadId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  },
  async escalationQueue(): Promise<Result<CrmLead[]>> {
    return ok(leads.filter((l) => l.escalated && !l.reviewClosed));
  },
  async pipeline(): Promise<Result<{ status: LeadStatus; count: number }[]>> {
    return ok(STATUSES.map((status) => ({ status, count: leads.filter((l) => l.status === status).length })));
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
    const id = `lead_new_${++leadCounter}`;
    const lead: CrmLead = {
      id,
      organisationId: ORG,
      name: input.name,
      email: input.email,
      phone: null,
      whatsapp: input.whatsapp ?? null,
      source: input.source ?? 'receptionist',
      conversation: input.conversation ?? [],
      assessmentSummary: input.assessmentSummary,
      assessment: input.assessment,
      recommendedSpecialistSlug: input.recommendedSpecialistSlug,
      recommendedSpecialistName: input.recommendedSpecialistName,
      recommendationConfidence: input.recommendationConfidence,
      alternativeMatches: input.alternativeMatches ?? [],
      humanReviewStatus: input.escalated ? 'pending' : 'not_required',
      assignedSpecialistSlug: null,
      status: input.escalated ? 'human_review' : input.recommendedSpecialistSlug ? 'recommended' : 'new',
      followUpStatus: input.escalated ? 'in_progress' : 'none',
      whatsappStatus: input.whatsapp ? 'requested' : 'none',
      subscriptionStatus: 'none',
      progress: 0,
      escalated: input.escalated,
      escalatedTo: input.escalated ? ESCALATION_TARGET.name : null,
      responsibleAdmin: null,
      notes: null,
      reviewClosed: false,
      reminderAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    leads.unshift(lead);
    addEvent(id, 'lead_created', 'Lead created by the Receptionist AI', input.assessmentSummary, 'Receptionist AI');
    if (input.escalated) addEvent(id, 'escalation', `Escalated to ${ESCALATION_TARGET.name}`, 'Below the confidence threshold.', 'Receptionist AI');
    return ok(lead);
  },

  async updateStatus(id: string, status: LeadStatus): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.status = status;
    lead.updatedAt = nowIso();
    addEvent(id, 'note', `Status changed to ${status}`, null, 'Admin');
    return ok(lead);
  },

  // ── Human-review / takeover workflow ──────────────────────────────────────
  async approveRecommendation(id: string): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.humanReviewStatus = 'approved';
    lead.assignedSpecialistSlug = lead.recommendedSpecialistSlug;
    lead.updatedAt = nowIso();
    addEvent(id, 'recommendation', 'Recommendation approved', lead.recommendedSpecialistName ? `Assigned ${lead.recommendedSpecialistName}.` : null, 'Admin');
    return ok(lead);
  },
  async changeRecommendation(id: string, slug: string, name: string): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.humanReviewStatus = 'changed';
    lead.assignedSpecialistSlug = slug;
    lead.recommendedSpecialistSlug = slug;
    lead.recommendedSpecialistName = name;
    lead.status = 'recommended';
    lead.updatedAt = nowIso();
    addEvent(id, 'recommendation', `Recommendation changed to ${name}`, null, 'Admin');
    return ok(lead);
  },
  async addNote(id: string, note: string, actor = 'Admin'): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.notes = lead.notes ? `${lead.notes}\n${note}` : note;
    lead.updatedAt = nowIso();
    addEvent(id, 'note', 'Note added', note, actor);
    return ok(lead);
  },
  async assign(id: string, admin: string): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.responsibleAdmin = admin;
    lead.updatedAt = nowIso();
    addEvent(id, 'note', `Assigned to ${admin}`, null, 'Admin');
    return ok(lead);
  },
  async setFollowUp(id: string, status: LeadFollowUp): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.followUpStatus = status;
    lead.updatedAt = nowIso();
    addEvent(id, 'follow_up', `Follow-up marked ${status}`, null, 'Admin');
    return ok(lead);
  },
  async setWhatsapp(id: string, status: LeadWhatsapp): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.whatsappStatus = status;
    lead.updatedAt = nowIso();
    addEvent(id, 'whatsapp_handoff', `WhatsApp follow-up marked ${status}`, null, 'Admin');
    return ok(lead);
  },
  /** A human takes over: appends a reply to the conversation as the team. */
  async takeOver(id: string, message: string, actor = 'Admin'): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.conversation = [...lead.conversation, { role: 'receptionist', text: message, at: nowIso() }];
    lead.updatedAt = nowIso();
    addEvent(id, 'note', 'A team member replied', message, actor);
    return ok(lead);
  },
  async setReviewStatus(id: string, review: LeadHumanReview): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.humanReviewStatus = review;
    lead.updatedAt = nowIso();
    return ok(lead);
  },
  async closeReview(id: string): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.reviewClosed = true;
    lead.updatedAt = nowIso();
    addEvent(id, 'note', 'Review closed', null, 'Admin');
    return ok(lead);
  },
  async reopenReview(id: string): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.reviewClosed = false;
    lead.updatedAt = nowIso();
    addEvent(id, 'note', 'Review reopened', null, 'Admin');
    return ok(lead);
  },
  async setReminder(id: string, at: string | null): Promise<Result<CrmLead>> {
    const lead = find(id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.reminderAt = at;
    lead.updatedAt = nowIso();
    addEvent(id, 'follow_up', at ? `Reminder set for ${at.slice(0, 10)}` : 'Reminder cleared', null, 'Admin');
    return ok(lead);
  },
};

/** Real DB when configured (production); in-process store only in local preview. */
function impl(): typeof mockCrm {
  return isSupabaseAdminConfigured() ? (crmRepo as typeof mockCrm) : mockCrm;
}

export const crm = {
  list: (...a: Parameters<typeof mockCrm.list>) => impl().list(...a),
  byId: (...a: Parameters<typeof mockCrm.byId>) => impl().byId(...a),
  events: (...a: Parameters<typeof mockCrm.events>) => impl().events(...a),
  escalationQueue: (...a: Parameters<typeof mockCrm.escalationQueue>) => impl().escalationQueue(...a),
  pipeline: (...a: Parameters<typeof mockCrm.pipeline>) => impl().pipeline(...a),
  create: (...a: Parameters<typeof mockCrm.create>) => impl().create(...a),
  updateStatus: (...a: Parameters<typeof mockCrm.updateStatus>) => impl().updateStatus(...a),
  approveRecommendation: (...a: Parameters<typeof mockCrm.approveRecommendation>) => impl().approveRecommendation(...a),
  changeRecommendation: (...a: Parameters<typeof mockCrm.changeRecommendation>) => impl().changeRecommendation(...a),
  addNote: (...a: Parameters<typeof mockCrm.addNote>) => impl().addNote(...a),
  assign: (...a: Parameters<typeof mockCrm.assign>) => impl().assign(...a),
  setFollowUp: (...a: Parameters<typeof mockCrm.setFollowUp>) => impl().setFollowUp(...a),
  setWhatsapp: (...a: Parameters<typeof mockCrm.setWhatsapp>) => impl().setWhatsapp(...a),
  takeOver: (...a: Parameters<typeof mockCrm.takeOver>) => impl().takeOver(...a),
  setReviewStatus: (...a: Parameters<typeof mockCrm.setReviewStatus>) => impl().setReviewStatus(...a),
  closeReview: (...a: Parameters<typeof mockCrm.closeReview>) => impl().closeReview(...a),
  reopenReview: (...a: Parameters<typeof mockCrm.reopenReview>) => impl().reopenReview(...a),
  setReminder: (...a: Parameters<typeof mockCrm.setReminder>) => impl().setReminder(...a),
};
