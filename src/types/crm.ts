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
export type LeadHumanReview = 'not_required' | 'pending' | 'approved' | 'changed';
export type LeadWhatsapp = 'none' | 'requested' | 'sent' | 'connected';
export type LeadSubscription = 'none' | 'trial' | 'active' | 'canceled';

/** One turn of the receptionist ↔ visitor conversation. */
export interface ConversationTurn {
  role: 'visitor' | 'receptionist';
  text: string;
  at: string;
}

/** One structured answer captured during the receptionist consultation. */
export interface ConsultAnswer {
  id: string;
  prompt: string;
  answer: string;
}

export interface CrmLead {
  id: string;
  organisationId: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  source: LeadSource;
  /** The complete receptionist ↔ visitor conversation. */
  conversation: ConversationTurn[];
  /** The receptionist AI's structured consultation summary. */
  assessmentSummary: string;
  /** Structured answers captured during the receptionist consultation. */
  assessment: Record<string, string>;
  recommendedSpecialistSlug: string | null;
  recommendedSpecialistName: string | null;
  /** How confident the receptionist was in the recommendation (0..1). */
  recommendationConfidence: number;
  /** Other possible specialist matches the receptionist considered. */
  alternativeMatches: { slug: string; name: string }[];
  /** Set by a human when a lead is reviewed / the recommendation is approved or changed. */
  humanReviewStatus: LeadHumanReview;
  assignedSpecialistSlug: string | null;
  status: LeadStatus;
  followUpStatus: LeadFollowUp;
  whatsappStatus: LeadWhatsapp;
  subscriptionStatus: LeadSubscription;
  /** Customer progress once subscribed (0..100). */
  progress: number;
  escalated: boolean;
  /** The escalation target (client / authorised team member) — configurable. */
  escalatedTo: string | null;
  /** The admin or team member responsible for this lead. */
  responsibleAdmin: string | null;
  notes: string | null;
  /** Whether a human has closed the review for this lead (reopenable). */
  reviewClosed: boolean;
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
  /** Other possible specialist matches the receptionist considered. */
  alternatives: { slug: string; name: string }[];
}

export type SubscriptionState = 'trialing' | 'active' | 'past_due' | 'canceled';

/**
 * Access scope of a subscription — one specialist, several selected specialists,
 * or all available specialists. Final packages/pricing are NOT yet defined; this
 * only keeps the architecture open to all three.
 */
export type SubscriptionScope = 'single' | 'multiple' | 'all';

export interface SpecialistSubscription {
  id: string;
  /** For scope='single', the subscribed specialist; null for 'multiple'/'all'. */
  specialistSlug: string | null;
  scope: SubscriptionScope;
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
