'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { receptionist } from './receptionist';
import { crm } from './crm';
import { createInMemoryRateLimiter, enforceRateLimit, RATE_LIMIT_POLICIES } from '@/lib/security/rate-limit';
import { RateLimitError } from '@/lib/security/errors';
import type { ReceptionistRecommendation, ConsultAnswer, ConversationTurn } from '@/types/crm';

/**
 * Public Server Actions for the Receptionist AI consultation flow, called from
 * the client console. The assessment is a REAL model call and the lead is a real
 * crm_leads row, so the public surface is bounded: per-visitor and per-instance
 * rate limits plus strict input size caps protect the AI spend. The limiter is
 * in-memory (per serverless instance) — best-effort back-pressure, not a quota.
 */

const assessVisitorLimiter = createInMemoryRateLimiter({ limit: 10, windowMs: 60_000 });
const assessInstanceLimiter = createInMemoryRateLimiter({ limit: 60, windowMs: 60_000 });
const leadLimiter = createInMemoryRateLimiter(RATE_LIMIT_POLICIES.contact);

const BUSY_MESSAGE = 'The receptionist is helping a lot of people right now — please try again in a minute.';

async function visitorKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

const turnSchema = z.object({
  role: z.enum(['visitor', 'receptionist']),
  text: z.string().max(2000),
  at: z.string().max(64),
});
const answerSchema = z.object({
  id: z.string().max(64),
  prompt: z.string().max(500),
  answer: z.string().max(1000),
});
const assessSchema = z.object({
  conversation: z.array(turnSchema).max(30),
  answers: z.array(answerSchema).max(12),
});

export async function receptionistAssessAction(input: {
  conversation: ConversationTurn[];
  answers: ConsultAnswer[];
}): Promise<
  | { ok: true; summary: string; recommendation: ReceptionistRecommendation }
  | { ok: false; error: string }
> {
  const parsed = assessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'The conversation is too long to assess. Please start a fresh consultation.' };
  try {
    await enforceRateLimit(assessVisitorLimiter, `assess:${await visitorKey()}`);
    await enforceRateLimit(assessInstanceLimiter, 'assess:instance');
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: BUSY_MESSAGE };
    throw e;
  }
  const result = await receptionist.assess({ conversation: parsed.data.conversation, answers: parsed.data.answers });
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, summary: result.data.summary, recommendation: result.data.recommendation };
}

const leadSchema = z.object({
  name: z.string().min(2, 'Please enter your name.').max(120),
  email: z.string().email('Please enter a valid email address.').max(254),
  whatsapp: z.string().max(40).optional().or(z.literal('')),
});

export async function receptionistLeadAction(input: {
  name: string;
  email: string;
  whatsapp?: string;
  conversation: ConversationTurn[];
  answers: ConsultAnswer[];
  summary: string;
  recommendation: ReceptionistRecommendation;
}): Promise<
  | { ok: true; leadId: string; escalated: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Please check your details.', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const conversationOk = assessSchema.safeParse({ conversation: input.conversation, answers: input.answers });
  if (!conversationOk.success) return { ok: false, error: 'Please check your details.' };
  try {
    await enforceRateLimit(leadLimiter, `lead:${await visitorKey()}`);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: BUSY_MESSAGE };
    throw e;
  }
  const rec = input.recommendation;
  const assessment: Record<string, string> = {};
  for (const a of input.answers) {
    if (a.answer.trim()) assessment[a.prompt] = a.answer.trim();
  }

  const created = await crm.create({
    name: parsed.data.name,
    email: parsed.data.email,
    whatsapp: parsed.data.whatsapp || null,
    conversation: input.conversation,
    assessmentSummary: String(input.summary ?? '').slice(0, 4000),
    assessment,
    recommendedSpecialistSlug: rec.escalate ? null : rec.specialistSlug,
    recommendedSpecialistName: rec.escalate ? null : rec.specialistName,
    recommendationConfidence: rec.confidence,
    alternativeMatches: rec.alternatives,
    escalated: rec.escalate,
    source: 'receptionist',
  });
  if (!created.ok) return { ok: false, error: created.error.message };
  return { ok: true, leadId: created.data.id, escalated: rec.escalate };
}

/** Visitor asks to continue on WhatsApp — records the request against the lead. */
export async function receptionistWhatsappAction(
  leadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await crm.setWhatsapp(leadId, 'requested');
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true };
}
