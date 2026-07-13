import referralMatrix from '@/data/herne/referral-matrix.json';

/** Pure loading + classification of the client referral matrix (no server deps). */

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
