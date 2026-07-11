/**
 * AI-business model — the customer lifecycle that the platform runs on:
 * Receptionist AI → recommendation → CRM lead → Specialist AI subscription →
 * follow-up / human escalation.
 *
 * The CRM is AI-CENTRIC: every lead records the receptionist's assessment, the
 * recommendation confidence, the assigned specialist AI, follow-up status and the
 * customer's progress. Mirrors migration 0015.
 */

export type LeadStatus =
  | 'new'
  | 'qualified'
  | 'recommended'
  | 'subscribed'
  | 'escalated'
  | 'lost';

export type LeadFollowUp = 'none' | 'scheduled' | 'in_progress' | 'done';
export type LeadSource = 'receptionist' | 'website' | 'referral' | 'whatsapp';

export interface CrmLead {
  id: string;
  organisationId: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  source: LeadSource;
  /** The receptionist AI's short qualification summary. */
  assessmentSummary: string;
  /** Structured answers captured during the receptionist consultation. */
  assessment: Record<string, string>;
  recommendedSpecialistSlug: string | null;
  recommendedSpecialistName: string | null;
  /** How confident the receptionist was in the recommendation (0..1). */
  recommendationConfidence: number;
  assignedSpecialistSlug: string | null;
  status: LeadStatus;
  followUpStatus: LeadFollowUp;
  /** Customer progress once subscribed (0..100). */
  progress: number;
  escalated: boolean;
  escalatedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadEventType =
  | 'consultation'
  | 'recommendation'
  | 'lead_created'
  | 'whatsapp_handoff'
  | 'escalation'
  | 'subscription'
  | 'follow_up'
  | 'note';

export interface CrmLeadEvent {
  id: string;
  leadId: string;
  type: LeadEventType;
  title: string;
  detail: string | null;
  actor: string;
  createdAt: string;
}

/** The receptionist's recommendation output (mock in the prototype). */
export interface ReceptionistRecommendation {
  specialistSlug: string;
  specialistName: string;
  /** 0..1 — below the confidence threshold triggers human escalation. */
  confidence: number;
  reasoning: string;
  escalate: boolean;
  alternativeSlug: string | null;
}

export type SubscriptionState = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface SpecialistSubscription {
  id: string;
  specialistSlug: string;
  customerName: string;
  customerEmail: string;
  state: SubscriptionState;
  mrr: number; // minor units
  startedAt: string;
  plan: string;
}

/** Business analytics for a single specialist AI product. */
export interface SpecialistAnalytics {
  subscribers: number;
  activeSubscribers: number;
  mrr: number; // minor units
  conversations30d: number;
  satisfaction: number; // 0..1
  churnRate: number; // 0..1
  avgResponseMs: number;
}

/** Roll-up across the whole AI business (the admin business dashboard). */
export interface BusinessSummary {
  specialists: number;
  activeSubscribers: number;
  mrr: number; // minor units
  currency: string;
  leads30d: number;
  recommendationRate: number; // 0..1 receptionist → recommendation
  escalationRate: number; // 0..1
  conversations30d: number;
}
