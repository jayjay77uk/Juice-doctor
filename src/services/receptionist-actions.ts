'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { receptionist } from './receptionist';
import { crm } from './crm';
import { getSession } from './auth';
import { createInMemoryRateLimiter, enforceRateLimit, RATE_LIMIT_POLICIES } from '@/lib/security/rate-limit';
import { RateLimitError } from '@/lib/security/errors';
import { track } from '@/lib/monitoring/events';
import { signReply } from '@/lib/voice/reply-signature';
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

/**
 * Clamp untrusted console input to the schema bounds BEFORE validating, so an
 * oversized turn degrades gracefully (truncated) instead of permanently
 * failing the visitor's consultation. Only whitelisted fields survive — the
 * clamped output (never the raw input) is what gets assessed and persisted,
 * so oversized or extra properties can never reach the database.
 */
function clampAssessInput(input: { conversation: ConversationTurn[]; answers: ConsultAnswer[] }): {
  conversation: ConversationTurn[];
  answers: ConsultAnswer[];
} {
  const conversation = (Array.isArray(input.conversation) ? input.conversation : [])
    .slice(-30)
    .map((t) => ({
      role: t?.role === 'receptionist' ? ('receptionist' as const) : ('visitor' as const),
      text: String(t?.text ?? '').slice(0, 2000),
      at: String(t?.at ?? '').slice(0, 64),
    }));
  const answers = (Array.isArray(input.answers) ? input.answers : [])
    .slice(0, 12)
    .map((a) => ({
      id: String(a?.id ?? '').slice(0, 64),
      prompt: String(a?.prompt ?? '').slice(0, 500),
      answer: String(a?.answer ?? '').slice(0, 1000),
    }));
  return { conversation, answers };
}

const recommendationSchema = z.object({
  specialistSlug: z.string().max(64),
  specialistName: z.string().max(120),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(2000),
  escalate: z.boolean(),
  alternativeSlug: z.string().max(64).nullable(),
  alternatives: z.array(z.object({ slug: z.string().max(64), name: z.string().max(120) })).max(8),
});

/**
 * ONE conversational receptionist turn (public console). Same clamps and
 * rate limits as the assessment path; additionally returns an HMAC signature
 * over the reply so the public TTS endpoint can voice ONLY genuine replies.
 */
export async function receptionistTurnAction(input: {
  conversation: ConversationTurn[];
}): Promise<
  | { ok: true; reply: string; replySig: string | null; action: 'continue' | 'recommend' | 'escalate'; recommendation: ReceptionistRecommendation | null; summary: string | null }
  | { ok: false; error: string }
> {
  const clamped = clampAssessInput({ conversation: input.conversation, answers: [] });
  const parsed = assessSchema.safeParse(clamped);
  if (!parsed.success || parsed.data.conversation.length === 0) {
    return { ok: false, error: 'That message could not be processed — please try again.' };
  }
  try {
    await enforceRateLimit(assessVisitorLimiter, `turn:${await visitorKey()}`);
    await enforceRateLimit(assessInstanceLimiter, 'turn:instance');
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: BUSY_MESSAGE };
    throw e;
  }
  if (parsed.data.conversation.length <= 2) {
    await track('receptionist.assessment_started', { turns: parsed.data.conversation.length });
  }
  const result = await receptionist.turn({ conversation: parsed.data.conversation });
  if (!result.ok) return { ok: false, error: result.error.message };
  if (result.data.action !== 'continue') {
    await track('receptionist.assessment_completed', {
      recommendedSlug: result.data.recommendation?.specialistSlug || 'none',
      confidence: result.data.recommendation?.confidence ?? 0,
      escalate: result.data.recommendation?.escalate ?? false,
    });
  }
  return {
    ok: true,
    reply: result.data.reply,
    replySig: signReply(result.data.reply),
    action: result.data.action,
    recommendation: result.data.recommendation,
    summary: result.data.summary,
  };
}

export async function receptionistAssessAction(input: {
  conversation: ConversationTurn[];
  answers: ConsultAnswer[];
}): Promise<
  | { ok: true; summary: string; recommendation: ReceptionistRecommendation }
  | { ok: false; error: string }
> {
  const clamped = clampAssessInput(input);
  const parsed = assessSchema.safeParse(clamped);
  if (!parsed.success) return { ok: false, error: 'The conversation could not be assessed. Please start a fresh consultation.' };
  try {
    await enforceRateLimit(assessVisitorLimiter, `assess:${await visitorKey()}`);
    await enforceRateLimit(assessInstanceLimiter, 'assess:instance');
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: BUSY_MESSAGE };
    throw e;
  }
  await track('receptionist.assessment_started', { turns: parsed.data.conversation.length });
  const result = await receptionist.assess({ conversation: parsed.data.conversation, answers: parsed.data.answers });
  if (!result.ok) return { ok: false, error: result.error.message };
  await track('receptionist.assessment_completed', {
    recommendedSlug: result.data.recommendation.specialistSlug || 'none',
    confidence: result.data.recommendation.confidence,
    escalate: result.data.recommendation.escalate,
  });
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
  // Persist ONLY the clamped/validated shapes — never the raw input objects
  // (zod strips unknown keys from its OUTPUT; the original object could smuggle
  // arbitrary-size extra properties into the stored lead JSON).
  const clamped = clampAssessInput({ conversation: input.conversation, answers: input.answers });
  const conversationOk = assessSchema.safeParse(clamped);
  if (!conversationOk.success) return { ok: false, error: 'Please check your details.' };
  const recOk = recommendationSchema.safeParse(input.recommendation);
  if (!recOk.success) return { ok: false, error: 'Please check your details.' };
  try {
    await enforceRateLimit(leadLimiter, `lead:${await visitorKey()}`);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: BUSY_MESSAGE };
    throw e;
  }
  const rec = recOk.data;
  const assessment: Record<string, string> = {};
  for (const a of conversationOk.data.answers) {
    if (a.answer.trim()) assessment[a.prompt] = a.answer.trim();
  }

  // A signed-in member's lead is linked to their account; a member (or the
  // same email) continuing their journey UPDATES their open lead — the
  // receptionist never spawns duplicate leads for one ongoing journey.
  const session = await getSession();
  const userId = session?.user.id ?? null;
  const existing = await crm.findOpenForMember(userId, parsed.data.email);
  const consultation = {
    conversation: conversationOk.data.conversation,
    assessmentSummary: String(input.summary ?? '').slice(0, 4000),
    assessment,
    recommendedSpecialistSlug: rec.escalate ? null : rec.specialistSlug,
    recommendedSpecialistName: rec.escalate ? null : rec.specialistName,
    recommendationConfidence: rec.confidence,
    alternativeMatches: rec.alternatives,
    escalated: rec.escalate,
  };
  if (existing.ok && existing.data) {
    const updated = await crm.updateConsultation(existing.data.id, { ...consultation, userId });
    if (!updated.ok) return { ok: false, error: updated.error.message };
    return { ok: true, leadId: updated.data.id, escalated: rec.escalate };
  }

  const created = await crm.create({
    name: parsed.data.name,
    email: parsed.data.email,
    whatsapp: parsed.data.whatsapp || null,
    ...consultation,
    source: 'receptionist',
    userId,
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
