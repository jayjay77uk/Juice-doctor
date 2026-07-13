import { herneProfile } from '@/data/herne/specialist-profiles';

/**
 * Pure HERNE retrieval scoring — no server/DB deps, so it is unit-testable. The
 * ranking is the client's conceptual model; the breakdown is retained so any
 * selected record can be explained.
 */

export interface RetrievalWeights {
  semantic: number;
  specialistPriority: number;
  hernePillar: number;
  goal: number;
  evidenceQuality: number;
  reviewStatus: number;
  contraindication: number;
  scopeMismatch: number;
}

export const DEFAULT_WEIGHTS: RetrievalWeights = {
  semantic: 0.3,
  specialistPriority: 0.35,
  hernePillar: 0.1,
  goal: 0.05,
  evidenceQuality: 0.1,
  reviewStatus: 0.05,
  contraindication: 0.15,
  scopeMismatch: 0.25,
};

export interface ScoreBreakdown {
  semantic: number;
  specialistPriority: number;
  hernePillar: number;
  goal: number;
  evidenceQuality: number;
  reviewStatus: number;
  contraindicationPenalty: number;
  scopeMismatchPenalty: number;
  final: number;
}

export interface ScoreInput {
  specialistRelevance: Record<string, { priority?: number; role?: string }>;
  primaryPillar: string | null;
  evidenceStrength: string;
  status: string;
  safetyHasReviewFlag: boolean;
  text: string;
}

export const ALARM_TERMS = ['pain', 'chest', 'blood', 'faint', 'pregnan', 'medication', 'kidney', 'vomit', 'weight loss', 'confusion', 'suicid'];

export function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
}

export function overlap(queryTokens: Set<string>, text: string): number {
  if (!queryTokens.size) return 0;
  const t = tokens(text);
  let hit = 0;
  for (const q of queryTokens) if (t.has(q)) hit += 1;
  return hit / queryTokens.size;
}

export function evidenceQuality(strength: string): number {
  const s = strength.toLowerCase();
  if (s.startsWith('high')) return 1;
  if (s.startsWith('mod') || s.startsWith('med')) return 0.6;
  if (s.startsWith('low')) return 0.3;
  return 0.5;
}

export function reviewStatus(status: string): number {
  const s = status.toLowerCase();
  if (s.includes('approved') || s.includes('published')) return 1;
  if (s.includes('reviewed')) return 0.85;
  if (s.includes('seed')) return 0.7;
  return 0.5;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Pure, explainable multi-factor score of one record for one specialist + query. */
export function scoreEvidence(
  input: ScoreInput,
  specialistId: string,
  query: string,
  opts?: { goal?: string; weights?: RetrievalWeights },
): ScoreBreakdown {
  const w = opts?.weights ?? DEFAULT_WEIGHTS;
  const qTokens = tokens(query);
  const goalTokens = opts?.goal ? tokens(opts.goal) : new Set<string>();
  const queryHasAlarm = ALARM_TERMS.some((t) => query.toLowerCase().includes(t));
  const hernePriority = (herneProfile(specialistId)?.hernePriority ?? '').toLowerCase();

  const mine = input.specialistRelevance[specialistId] ?? { priority: 0, role: 'background' };
  const semantic = overlap(qTokens, input.text);
  const specialistPriority = Math.max(0, Math.min(1, Number(mine.priority) || 0));
  const hernePillar = input.primaryPillar && hernePriority.includes(input.primaryPillar.toLowerCase()) ? 1 : 0;
  const goal = goalTokens.size ? overlap(goalTokens, input.text) : 0;
  const eq = evidenceQuality(input.evidenceStrength);
  const rs = reviewStatus(input.status);
  const role = String(mine.role ?? 'background');
  const scopeMismatch = role === 'background' ? 1 : role === 'coordination' ? 0.3 : 0;
  const contraindication = queryHasAlarm && input.safetyHasReviewFlag && role === 'background' ? 1 : 0;

  const final =
    w.semantic * semantic +
    w.specialistPriority * specialistPriority +
    w.hernePillar * hernePillar +
    w.goal * goal +
    w.evidenceQuality * eq +
    w.reviewStatus * rs -
    w.contraindication * contraindication -
    w.scopeMismatch * scopeMismatch;

  return {
    semantic: round(semantic),
    specialistPriority: round(specialistPriority),
    hernePillar,
    goal: round(goal),
    evidenceQuality: eq,
    reviewStatus: rs,
    contraindicationPenalty: contraindication,
    scopeMismatchPenalty: round(scopeMismatch),
    final: round(final),
  };
}
