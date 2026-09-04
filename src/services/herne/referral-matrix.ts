import referralMatrix from '@/data/herne/referral-matrix.json';
import { HERNE_SPECIALIST_PROFILES } from '@/data/herne/specialist-profiles';

/** Pure loading + classification of the client referral matrix (no server deps). */

const NAME_TO_SLUG = new Map(HERNE_SPECIALIST_PROFILES.map((p) => [p.name.toLowerCase(), p.specialistId]));

/**
 * Normalise a matrix specialist reference to a slug. The matrix stores display
 * names ('Aqua', 'Serena') while runtime identity is the slug ('aqua') — any
 * comparison must go through this, never a raw equality check.
 */
export function normalizeSpecialistRef(ref: string): string {
  const t = ref.trim().toLowerCase();
  return NAME_TO_SLUG.get(t) ?? t;
}

/** Whether a matrix reference is a wildcard rather than a named specialist. */
export function isWildcardRef(ref: string): boolean {
  const t = ref.trim().toLowerCase();
  return t === 'any' || t === 'any specialist' || t === 'relevant specialist';
}

export interface MatrixRule {
  from_specialist: string;
  to_specialist: string;
  trigger: string;
  urgency?: string;
  handoff_instruction?: string;
}

const HUMAN_MARKERS = ['human', 'clinical', 'practitioner', 'emergency'];

export function isHumanEscalation(to: string): boolean {
  const t = to.toLowerCase();
  return HUMAN_MARKERS.some((m) => t.includes(m));
}

export function loadReferralMatrix(): MatrixRule[] {
  return referralMatrix as MatrixRule[];
}

export function classifyRules(): (MatrixRule & { isHumanEscalation: boolean })[] {
  return loadReferralMatrix().map((r) => ({ ...r, isHumanEscalation: isHumanEscalation(r.to_specialist) }));
}

/**
 * True when a sentence frames a colleague handoff as a HYPOTHETICAL rather than
 * an actual referral — "if you ever need supplement advice, I'd bring in Felix"
 * is a specialist explaining how the team works, not a handoff happening now.
 * Writing a referral record (and showing a "Suggested" chip) for these is noise.
 */
const HYPOTHETICAL_HANDOFF =
  /\b(?:if|whenever|when(?:ever)?|should you|in case|unless|might need|ever need|would (?:be|bring|loop|pass)|could bring)\b/i;

export function isHypotheticalHandoff(sentence: string): boolean {
  return HYPOTHETICAL_HANDOFF.test(sentence);
}
