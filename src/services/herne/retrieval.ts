import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from './records';
import { ensureIngested } from './ingestion';
import { scoreEvidence, type ScoreBreakdown, type RetrievalWeights } from './scoring';
import { knowledgeRepo } from '../repositories/knowledge-repo';

export { DEFAULT_WEIGHTS, scoreEvidence } from './scoring';
export type { RetrievalWeights, ScoreBreakdown, ScoreInput } from './scoring';

/**
 * HERNE retrieval over the ONE shared evidence base. Records are ranked by the
 * pure multi-factor scorer (scoring.ts) — never semantic similarity alone — and
 * the breakdown is retained so any selection can be explained. Specialists
 * differentiate by their per-record specialist_relevance.
 */

export interface HerneRetrieved {
  recordId: string;
  claim: string;
  documentText: string;
  primaryPillar: string | null;
  sourceTitle: string;
  sourceUrl: string;
  evidenceStrength: string;
  role: string;
  safety: Record<string, unknown>;
  responseGuidance: Record<string, unknown>;
  score: ScoreBreakdown;
}

type Row = Record<string, unknown>;

export async function retrieveForSpecialist(
  specialistId: string,
  query: string,
  opts?: { goal?: string; limit?: number; weights?: RetrievalWeights; agentId?: string },
): Promise<HerneRetrieved[]> {
  const sb = createAdminClient();
  if (!sb) return [];
  await ensureIngested();

  const { data } = await sb.from('herne_evidence_records').select('*').eq('organisation_id', HERNE_ORG)
    .in('status', ['reviewed_seed', 'reviewed', 'approved', 'published']);
  const rows = (data ?? []) as Row[];
  const limit = opts?.limit ?? 4; // 3–6 default band

  const scored: HerneRetrieved[] = rows.map((r) => {
    const rel = (r.specialist_relevance as Record<string, { priority?: number; role?: string }> | null) ?? {};
    const evidence = (r.evidence as Record<string, unknown>) ?? {};
    const safetyObj = (r.safety as Record<string, unknown>) ?? {};
    const primaryPillar = (r.primary_pillar as string | null) ?? null;
    const score = scoreEvidence(
      {
        specialistRelevance: rel,
        primaryPillar,
        evidenceStrength: String(evidence.strength ?? ''),
        status: String(r.status ?? ''),
        safetyHasReviewFlag: Array.isArray(safetyObj.human_review_when) && safetyObj.human_review_when.length > 0,
        text: `${String(r.claim)} ${String(r.document_text)}`,
      },
      specialistId,
      query,
      { ...(opts?.goal ? { goal: opts.goal } : {}), ...(opts?.weights ? { weights: opts.weights } : {}) },
    );
    return {
      recordId: String(r.record_id),
      claim: String(r.claim),
      documentText: String(r.document_text),
      primaryPillar,
      sourceTitle: String(evidence.source_title ?? ''),
      sourceUrl: String(evidence.source_url ?? ''),
      evidenceStrength: String(evidence.strength ?? ''),
      role: String((rel[specialistId] ?? {}).role ?? 'background'),
      safety: safetyObj,
      responseGuidance: (r.response_guidance as Record<string, unknown>) ?? {},
      score,
    };
  });

  const assigned = opts?.agentId ? await knowledgeRepo.retrieve(opts.agentId, query, limit) : [];
  const documents: HerneRetrieved[] = assigned.map(chunk => ({
    recordId: `DOC-${chunk.documentId.toUpperCase()}-${chunk.chunkIndex}`,
    claim: `Assigned reference: ${chunk.documentTitle}`,
    documentText: chunk.content, primaryPillar: null, sourceTitle: chunk.documentTitle,
    sourceUrl: '', evidenceStrength: 'Organisation-published reference; clinical evidence strength not independently assessed',
    role: 'background', safety: {}, responseGuidance: {},
    score: scoreEvidence({ specialistRelevance: {}, primaryPillar: null, evidenceStrength: '', status: 'published', safetyHasReviewFlag: false, text: chunk.content }, specialistId, query),
  }));
  return [...scored.sort((a, b) => b.score.final - a.score.final).slice(0, limit), ...documents];
}
