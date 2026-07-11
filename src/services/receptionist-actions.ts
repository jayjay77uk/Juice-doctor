'use server';

import { z } from 'zod';
import { receptionist } from './receptionist';
import { crm } from './crm';
import type { ReceptionistRecommendation, ConsultAnswer, ConversationTurn } from '@/types/crm';

/**
 * Public Server Actions for the Receptionist AI consultation flow, called from
 * the client console. Prototype: the recommendation is a deterministic mock and
 * the lead is written to the in-process CRM store. Production replaces the
 * assess body with a model call and the store with Supabase — the action
 * signatures do not change.
 */

export async function receptionistAssessAction(input: {
  conversation: ConversationTurn[];
  answers: ConsultAnswer[];
}): Promise<
  | { ok: true; summary: string; recommendation: ReceptionistRecommendation }
  | { ok: false; error: string }
> {
  const result = await receptionist.assess(input);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, summary: result.data.summary, recommendation: result.data.recommendation };
}

const leadSchema = z.object({
  name: z.string().min(2, 'Please enter your name.'),
  email: z.string().email('Please enter a valid email address.'),
  whatsapp: z.string().optional().or(z.literal('')),
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
    assessmentSummary: input.summary,
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
