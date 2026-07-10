/**
 * Commerce model — mirrors migration 0008. Provider-agnostic; no live payments.
 * Monetary amounts are integer minor units (pence) with an ISO currency code.
 */

export type ProgrammeFormat = 'one_to_one' | 'group' | 'corporate' | 'self_paced';
export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type BillingInterval = 'month' | 'year' | 'one_time';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface Plan {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
  interval: BillingInterval;
  priceAmount: number;
  currency: string;
  features: Record<string, unknown>;
  status: 'draft' | 'active' | 'archived' | 'deleted';
}

export interface Subscription {
  id: string;
  memberId: string;
  organisationId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  provider: string;
  providerSubscriptionId: string | null;
}

export interface Payment {
  id: string;
  memberId: string;
  organisationId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerPaymentId: string | null;
  description: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  memberId: string;
  organisationId: string;
  subscriptionId: string | null;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueAt: string | null;
  pdfPath: string | null;
}

export interface ProgrammeEnrollment {
  id: string;
  programmeId: string;
  memberId: string;
  organisationId: string;
  status: EnrollmentStatus;
  progress: number;
  startedAt: string;
  completedAt: string | null;
}
