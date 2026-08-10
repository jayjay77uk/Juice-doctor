/**
 * Estimated token pricing for cost tracking. These are approximate published
 * list prices in USD per million tokens and are used ONLY to record an *estimate*
 * against each AI call — never billed, never authoritative. Unknown models fall
 * back to a conservative default so cost is always recorded, never silently zero.
 *
 * Keep this a pure module (no server-only) so it is unit-testable and usable in
 * both the provider and the analytics read models.
 */

export interface ModelRate {
  /** USD per 1,000,000 input tokens. */
  inputPerMTok: number;
  /** USD per 1,000,000 output tokens. */
  outputPerMTok: number;
}

/** Approximate list prices. Matched by longest-prefix so dated model ids resolve. */
const RATES: Record<string, ModelRate> = {
  'claude-fable-5': { inputPerMTok: 10, outputPerMTok: 50 },
  // Opus 4.5+ moved to $5/$25; the bare 'claude-opus-4' prefix keeps the older
  // 4.0/4.1 models on their $15/$75 list price (longest-prefix wins).
  'claude-opus-4-8': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4-7': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4-6': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4-5': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-opus-4': { inputPerMTok: 15, outputPerMTok: 75 },
  'claude-sonnet-5': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-sonnet-4': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4': { inputPerMTok: 1, outputPerMTok: 5 },
  'claude-3-5-haiku': { inputPerMTok: 0.8, outputPerMTok: 4 },
  'claude-3-haiku': { inputPerMTok: 0.25, outputPerMTok: 1.25 },
};

/** A conservative default when a model is not in the table (so cost is never 0 by accident). */
const DEFAULT_RATE: ModelRate = { inputPerMTok: 3, outputPerMTok: 15 };

export function rateForModel(model: string): ModelRate {
  const key = Object.keys(RATES)
    .filter((k) => model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return (key && RATES[key]) || DEFAULT_RATE;
}

/** Estimated USD cost for a call. Returns 0 when usage is unknown. */
export function estimateCostUsd(model: string, usage: { inputTokens: number; outputTokens: number } | null | undefined): number {
  if (!usage) return 0;
  const rate = rateForModel(model);
  const cost = (usage.inputTokens / 1_000_000) * rate.inputPerMTok + (usage.outputTokens / 1_000_000) * rate.outputPerMTok;
  // Round to 6 dp (micro-dollars) — enough precision for per-call estimates.
  return Math.round(cost * 1_000_000) / 1_000_000;
}
