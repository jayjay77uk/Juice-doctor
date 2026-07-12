import { z } from 'zod';

/**
 * Structured-output contract for the Receptionist AI consultation result.
 * The live AI must return exactly this shape; it is validated before use so the
 * app never acts on malformed model output. `recommendedSpecialistIds` are
 * cross-checked against ACTIVE specialist records — the AI cannot invent one.
 */
export const receptionistResultSchema = z.object({
  summary: z.string().min(1),
  identifiedNeeds: z.array(z.string()).default([]),
  relevantFacts: z.array(z.string()).default([]),
  unansweredQuestions: z.array(z.string()).default([]),
  /** Specialist slugs the AI proposes; validated against active specialists. */
  recommendedSpecialistIds: z.array(z.string()).default([]),
  primaryRecommendation: z.string().nullable(),
  alternativeRecommendations: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  escalationRequired: z.boolean(),
  escalationReason: z.string().nullable(),
  suggestedNextAction: z.string(),
});

export type ReceptionistResult = z.infer<typeof receptionistResultSchema>;

/** Parse helper matching the AiProvider.structured() contract. */
export function parseReceptionistResult(
  value: unknown,
): { ok: true; value: ReceptionistResult } | { ok: false; error: string } {
  const result = receptionistResultSchema.safeParse(value);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
}
