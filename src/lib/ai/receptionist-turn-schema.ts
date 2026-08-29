import { z } from 'zod';

/**
 * Structured output for ONE conversational receptionist turn. The model
 * decides — from the visitor's actual message — whether to keep conversing,
 * recommend a specialist, or hand over to a human. `reply` is always the
 * natural-language message shown (and optionally spoken) to the visitor.
 */

export const receptionistTurnSchema = z.object({
  /** Makela's natural conversational reply to the visitor's last message. */
  reply: z.string().min(1).max(2000),
  /** What this turn does: keep talking, route to a specialist, or hand to a human. */
  action: z.enum(['continue', 'recommend', 'escalate']),
  /** Exact specialist slug when action is 'recommend'; otherwise null. */
  primaryRecommendation: z.string().nullable(),
  alternativeRecommendations: z.array(z.string()).max(4).default([]),
  /** Genuine confidence (0..1) in the primary recommendation. */
  confidence: z.number().min(0).max(1).default(0),
  /** Plain-English summary of the visitor's need — required when routing. */
  summary: z.string().max(2000).nullable().default(null),
  escalationReason: z.string().max(500).nullable().default(null),
});

export type ReceptionistTurn = z.infer<typeof receptionistTurnSchema>;

/** Parse helper matching the AiProvider.structured() contract. */
export function parseReceptionistTurnResult(
  value: unknown,
): { ok: true; value: ReceptionistTurn } | { ok: false; error: string } {
  const result = receptionistTurnSchema.safeParse(value);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
}
