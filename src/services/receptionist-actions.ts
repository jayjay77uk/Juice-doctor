'use server';

import { z } from 'zod';
import { receptionist } from './receptionist';
import { crm } from './crm';
import type { ReceptionistRecommendation } from '@/types/crm';

/**
 * Public Server Actions for the Receptionist AI consultation flow. Called
 * directly from the client (they return values). Prototype: the recommendation
 * is rule-based and the lead is written to the mock CRM store. Production
 * replaces the consult body with a model call and the store with Supabase.
 */

export async function receptionistConsultAction(
  answers: Record<string, string>,
): Promise<{ ok: true; recommendation: ReceptionistRecommendation } | { ok: false; error: string }> {
  const result = await receptionist.consult(answers);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, recommendation: result.data };
}

const leadSchema = z.object({
  name: z.string().min(2, 'Please enter your name.'),
  email: z.string().email('Please enter a valid email.'),
  whatsapp: z.string().optional().or(z.literal('')),
});

export async function receptionistLeadAction(input: {
  name: string;
  email: string;
  whatsapp?: string;
  answers: Record<string, string>;
  recommendation: ReceptionistRecommendation;
}): Promise<{ ok: true; leadId: string; escalated: boolean } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Please check your details.', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const rec = input.recommendation;
  const created = await crm.create({
    name: parsed.data.name,
    email: parsed.data.email,
    whatsapp: parsed.data.whatsapp || null,
    assessmentSummary: rec.reasoning,
    assessment: input.answers,
    recommendedSpecialistSlug: rec.escalate ? null : rec.specialistSlug,
    recommendedSpecialistName: rec.escalate ? null : rec.specialistName,
    recommendationConfidence: rec.confidence,
    escalated: rec.escalate,
    source: 'receptionist',
  });
  if (!created.ok) return { ok: false, error: created.error.message };
  return { ok: true, leadId: created.data.id, escalated: rec.escalate };
}
