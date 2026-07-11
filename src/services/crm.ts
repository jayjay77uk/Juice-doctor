import 'server-only';

import type { CrmLead, CrmLeadEvent, LeadStatus, ConversationTurn } from '@/types/crm';
import { ESCALATION_TARGET } from '@/config/receptionist';
import { ok, err, type Result } from './result';

/**
 * AI-centric CRM — the operational core. Every lead is created by the
 * Receptionist AI and records the full conversation, the consultation summary,
 * the recommendation + confidence, alternative matches, the assigned specialist,
 * human-review/WhatsApp/subscription/follow-up status, progress, notes and a
 * responsible team member. Prototype uses a mutable in-process store; production
 * reads crm_leads + crm_lead_events (migration 0015).
 *
 * Seed content is NEUTRAL PLACEHOLDER data referencing the four configurable
 * specialist placeholders — no invented product/wellness content.
 */

const ORG = '00000000-0000-0000-0000-000000000001';
let leadCounter = 0;
let eventCounter = 0;

function nowIso(): string {
  return new Date().toISOString();
}

const emptyConversation: ConversationTurn[] = [];

const leads: CrmLead[] = [
  {
    id: 'lead_1', organisationId: ORG, name: 'Lead 1 [name]', email: 'lead1@example.com', phone: null, whatsapp: '+44 …',
    source: 'receptionist', conversation: emptyConversation,
    assessmentSummary: '[Consultation summary] — recommended Specialist AI 1.',
    assessment: { 'Question 1': '[Answer]', 'Question 2': '[Answer]' },
    recommendedSpecialistSlug: 'specialist-ai-1', recommendedSpecialistName: 'Specialist AI 1', recommendationConfidence: 0.72,
    alternativeMatches: [{ slug: 'specialist-ai-2', name: 'Specialist AI 2' }],
    humanReviewStatus: 'not_required', assignedSpecialistSlug: 'specialist-ai-1', status: 'subscribed',
    followUpStatus: 'scheduled', whatsappStatus: 'connected', subscriptionStatus: 'active', progress: 40,
    escalated: false, escalatedTo: null, responsibleAdmin: null, notes: null,
    createdAt: '2026-07-06T09:12:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z',
  },
  {
    id: 'lead_2', organisationId: ORG, name: 'Lead 2 [name]', email: 'lead2@example.com', phone: null, whatsapp: '+44 …',
    source: 'receptionist', conversation: emptyConversation,
    assessmentSummary: '[Consultation summary] — the receptionist could not confidently decide; escalated for review.',
    assessment: { 'Question 1': '[Answer]' },
    recommendedSpecialistSlug: null, recommendedSpecialistName: null, recommendationConfidence: 0.34,
    alternativeMatches: [{ slug: 'specialist-ai-1', name: 'Specialist AI 1' }, { slug: 'specialist-ai-3', name: 'Specialist AI 3' }],
    humanReviewStatus: 'pending', assignedSpecialistSlug: null, status: 'escalated',
    followUpStatus: 'in_progress', whatsappStatus: 'requested', subscriptionStatus: 'none', progress: 0,
    escalated: true, escalatedTo: ESCALATION_TARGET.name, responsibleAdmin: null, notes: null,
    createdAt: '2026-07-10T08:40:00.000Z', updatedAt: '2026-07-10T09:00:00.000Z',
  },
  {
    id: 'lead_3', organisationId: ORG, name: 'Lead 3 [name]', email: 'lead3@example.com', phone: null, whatsapp: null,
    source: 'website', conversation: emptyConversation,
    assessmentSummary: '[Consultation summary] — recommended Specialist AI 3.',
    assessment: { 'Question 1': '[Answer]', 'Question 2': '[Answer]' },
    recommendedSpecialistSlug: 'specialist-ai-3', recommendedSpecialistName: 'Specialist AI 3', recommendationConfidence: 0.7,
    alternativeMatches: [{ slug: 'specialist-ai-4', name: 'Specialist AI 4' }],
    humanReviewStatus: 'not_required', assignedSpecialistSlug: null, status: 'recommended',
    followUpStatus: 'none', whatsappStatus: 'none', subscriptionStatus: 'none', progress: 0,
    escalated: false, escalatedTo: null, responsibleAdmin: null, notes: null,
    createdAt: '2026-07-09T14:20:00.000Z', updatedAt: '2026-07-09T14:20:00.000Z',
  },
  {
    id: 'lead_4', organisationId: ORG, name: 'Lead 4 [name]', email: 'lead4@example.com', phone: '+44 …', whatsapp: null,
    source: 'referral', conversation: emptyConversation,
    assessmentSummary: '[Consultation summary] — recommended Specialist AI 2.',
    assessment: { 'Question 1': '[Answer]' },
    recommendedSpecialistSlug: 'specialist-ai-2', recommendedSpecialistName: 'Specialist AI 2', recommendationConfidence: 0.68,
    alternativeMatches: [], humanReviewStatus: 'approved', assignedSpecialistSlug: 'specialist-ai-2', status: 'subscribed',
    followUpStatus: 'done', whatsappStatus: 'connected', subscriptionStatus: 'active', progress: 65,
    escalated: false, escalatedTo: null, responsibleAdmin: null, notes: null,
    createdAt: '2026-07-04T11:05:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z',
  },
];

const events: CrmLeadEvent[] = [
  { id: 'ev_1', leadId: 'lead_1', type: 'consultation', title: 'Receptionist consultation completed', detail: null, actor: 'Receptionist AI', createdAt: '2026-07-06T09:12:00.000Z' },
  { id: 'ev_2', leadId: 'lead_1', type: 'recommendation', title: 'Recommended Specialist AI 1', detail: 'Confidence 72%.', actor: 'Receptionist AI', createdAt: '2026-07-06T09:13:00.000Z' },
  { id: 'ev_3', leadId: 'lead_1', type: 'subscription', title: 'Subscribed to Specialist AI 1', detail: null, actor: 'Lead 1 [name]', createdAt: '2026-07-06T09:20:00.000Z' },
  { id: 'ev_4', leadId: 'lead_2', type: 'consultation', title: 'Receptionist consultation completed', detail: null, actor: 'Receptionist AI', createdAt: '2026-07-10T08:40:00.000Z' },
  { id: 'ev_5', leadId: 'lead_2', type: 'escalation', title: `Escalated to ${ESCALATION_TARGET.name}`, detail: 'Below the confidence threshold.', actor: 'Receptionist AI', createdAt: '2026-07-10T08:41:00.000Z' },
];

const STATUSES: LeadStatus[] = ['new', 'qualified', 'recommended', 'subscribed', 'escalated', 'lost'];

export const crm = {
  async list(filter?: { status?: LeadStatus }): Promise<Result<CrmLead[]>> {
    let rows = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter?.status) rows = rows.filter((l) => l.status === filter.status);
    return ok(rows);
  },
  async byId(id: string): Promise<Result<CrmLead>> {
    const match = leads.find((l) => l.id === id);
    return match ? ok(match) : err({ code: 'not_found', message: 'Lead not found.' });
  },
  async events(leadId: string): Promise<Result<CrmLeadEvent[]>> {
    return ok(events.filter((e) => e.leadId === leadId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  },
  async escalationQueue(): Promise<Result<CrmLead[]>> {
    return ok(leads.filter((l) => l.escalated));
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
      status: input.escalated ? 'escalated' : input.recommendedSpecialistSlug ? 'recommended' : 'qualified',
      followUpStatus: input.escalated ? 'in_progress' : 'none',
      whatsappStatus: input.whatsapp ? 'requested' : 'none',
      subscriptionStatus: 'none',
      progress: 0,
      escalated: input.escalated,
      escalatedTo: input.escalated ? ESCALATION_TARGET.name : null,
      responsibleAdmin: null,
      notes: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    leads.unshift(lead);
    events.push({ id: `ev_new_${++eventCounter}`, leadId: id, type: 'lead_created', title: 'Lead created by the Receptionist AI', detail: input.assessmentSummary, actor: 'Receptionist AI', createdAt: nowIso() });
    return ok(lead);
  },
  async updateStatus(id: string, status: LeadStatus): Promise<Result<CrmLead>> {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return err({ code: 'not_found', message: 'Lead not found.' });
    lead.status = status;
    lead.updatedAt = nowIso();
    return ok(lead);
  },
};
