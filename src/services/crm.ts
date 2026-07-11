import 'server-only';

import type { CrmLead, CrmLeadEvent, LeadStatus, LeadEventType } from '@/types/crm';
import { ok, err, type Result } from './result';

/**
 * AI-centric CRM — the operational core of the AI business. Every lead is
 * created by the Receptionist AI and records its assessment, the recommendation
 * confidence, the assigned specialist AI, follow-up status and customer progress.
 * Prototype uses a mutable in-process store; production reads crm_leads +
 * crm_lead_events (migration 0015).
 */

const ORG = '00000000-0000-0000-0000-000000000001';
let leadCounter = 0;
let eventCounter = 0;

function nowIso(): string {
  return new Date().toISOString();
}

const leads: CrmLead[] = [
  {
    id: 'lead_1', organisationId: ORG, name: 'Rachel Adeyemi', email: 'rachel@example.com', phone: '+44 7700 900001', whatsapp: '+44 7700 900001',
    source: 'receptionist', assessmentSummary: 'Low afternoon energy, poor hydration habits. Good fit for hydration coaching.',
    assessment: { goal: 'More energy', mainConcern: 'Afternoon slumps', water: 'Not great', sleep: 'Okay' },
    recommendedSpecialistSlug: 'hydration-specialist', recommendedSpecialistName: 'The Hydration Specialist', recommendationConfidence: 0.91,
    assignedSpecialistSlug: 'hydration-specialist', status: 'subscribed', followUpStatus: 'scheduled', progress: 48, escalated: false, escalatedTo: null,
    createdAt: '2026-07-06T09:12:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z',
  },
  {
    id: 'lead_2', organisationId: ORG, name: 'Tom Blake', email: 'tom@example.com', phone: null, whatsapp: '+44 7700 900002',
    source: 'receptionist', assessmentSummary: 'Mentioned persistent chest tightness — flagged for human review, not routed to a specialist.',
    assessment: { goal: 'Feel better', mainConcern: 'Chest tightness', water: 'Okay', sleep: 'Struggling' },
    recommendedSpecialistSlug: null, recommendedSpecialistName: null, recommendationConfidence: 0.34,
    assignedSpecialistSlug: null, status: 'escalated', followUpStatus: 'in_progress', progress: 0, escalated: true, escalatedTo: 'Erran Warden',
    createdAt: '2026-07-10T08:40:00.000Z', updatedAt: '2026-07-10T09:00:00.000Z',
  },
  {
    id: 'lead_3', organisationId: ORG, name: 'Priya Shah', email: 'priya@example.com', phone: null, whatsapp: null,
    source: 'website', assessmentSummary: 'Wants to fix sleep and reduce evening cravings. Strong sleep-specialist fit.',
    assessment: { goal: 'Deeper sleep', mainConcern: 'Waking at 3am', water: 'Great', sleep: 'Struggling' },
    recommendedSpecialistSlug: 'sleep-specialist', recommendedSpecialistName: 'The Sleep & Recovery Specialist', recommendationConfidence: 0.87,
    assignedSpecialistSlug: null, status: 'recommended', followUpStatus: 'none', progress: 0, escalated: false, escalatedTo: null,
    createdAt: '2026-07-09T14:20:00.000Z', updatedAt: '2026-07-09T14:20:00.000Z',
  },
  {
    id: 'lead_4', organisationId: ORG, name: 'Marcus Cole', email: 'marcus@example.com', phone: '+44 7700 900004', whatsapp: null,
    source: 'referral', assessmentSummary: 'General wellbeing reset — recommended the all-round companion.',
    assessment: { goal: 'Reset everything', mainConcern: 'Where to start', water: 'Not great', sleep: 'Okay' },
    recommendedSpecialistSlug: 'wellbeing-companion', recommendedSpecialistName: 'The Wellbeing Companion', recommendationConfidence: 0.78,
    assignedSpecialistSlug: 'wellbeing-companion', status: 'subscribed', followUpStatus: 'done', progress: 72, escalated: false, escalatedTo: null,
    createdAt: '2026-07-04T11:05:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z',
  },
  {
    id: 'lead_5', organisationId: ORG, name: 'Leah Fraser', email: 'leah@example.com', phone: null, whatsapp: '+44 7700 900005',
    source: 'receptionist', assessmentSummary: 'Nutrition-focused; wants to eat for steady energy. Handed off to WhatsApp to complete signup.',
    assessment: { goal: 'Eat better', mainConcern: 'Energy crashes', water: 'Okay', sleep: 'Great' },
    recommendedSpecialistSlug: 'nutrition-specialist', recommendedSpecialistName: 'The Nutrition Specialist', recommendationConfidence: 0.83,
    assignedSpecialistSlug: null, status: 'qualified', followUpStatus: 'scheduled', progress: 0, escalated: false, escalatedTo: null,
    createdAt: '2026-07-10T16:30:00.000Z', updatedAt: '2026-07-10T16:35:00.000Z',
  },
];

const events: CrmLeadEvent[] = [
  { id: 'ev_1', leadId: 'lead_1', type: 'consultation', title: 'Receptionist consultation completed', detail: 'Captured goals and habits.', actor: 'The Receptionist', createdAt: '2026-07-06T09:12:00.000Z' },
  { id: 'ev_2', leadId: 'lead_1', type: 'recommendation', title: 'Recommended The Hydration Specialist', detail: 'Confidence 91%.', actor: 'The Receptionist', createdAt: '2026-07-06T09:13:00.000Z' },
  { id: 'ev_3', leadId: 'lead_1', type: 'subscription', title: 'Subscribed to The Hydration Specialist', detail: '£19 / month.', actor: 'Rachel Adeyemi', createdAt: '2026-07-06T09:20:00.000Z' },
  { id: 'ev_4', leadId: 'lead_2', type: 'consultation', title: 'Receptionist consultation completed', detail: null, actor: 'The Receptionist', createdAt: '2026-07-10T08:40:00.000Z' },
  { id: 'ev_5', leadId: 'lead_2', type: 'escalation', title: 'Escalated to human expert', detail: 'Low confidence + red-flag symptom (chest tightness).', actor: 'The Receptionist', createdAt: '2026-07-10T08:41:00.000Z' },
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
    assessmentSummary: string;
    assessment: Record<string, string>;
    recommendedSpecialistSlug: string | null;
    recommendedSpecialistName: string | null;
    recommendationConfidence: number;
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
      assessmentSummary: input.assessmentSummary,
      assessment: input.assessment,
      recommendedSpecialistSlug: input.recommendedSpecialistSlug,
      recommendedSpecialistName: input.recommendedSpecialistName,
      recommendationConfidence: input.recommendationConfidence,
      assignedSpecialistSlug: null,
      status: input.escalated ? 'escalated' : input.recommendedSpecialistSlug ? 'recommended' : 'qualified',
      followUpStatus: input.escalated ? 'in_progress' : 'none',
      progress: 0,
      escalated: input.escalated,
      escalatedTo: input.escalated ? 'Erran Warden' : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    leads.unshift(lead);
    events.push({ id: `ev_new_${++eventCounter}`, leadId: id, type: 'lead_created', title: 'Lead created by the Receptionist AI', detail: input.assessmentSummary, actor: 'The Receptionist', createdAt: nowIso() });
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
