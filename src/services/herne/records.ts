import { HERNE_KNOWLEDGE_JSONL } from '@/data/herne/knowledge-records';

/**
 * Pure HERNE evidence-record types + line-by-line parsing/validation. No server
 * or DB dependencies, so it is unit-testable. The DB ingestion command lives in
 * ingestion.ts and builds on this. Records are validated atomically — a malformed
 * line is rejected (with line number + reason) without affecting valid records.
 */

export const HERNE_ORG = '00000000-0000-0000-0000-000000000001';
export const HERNE_SPECIALIST_IDS = ['makela', 'serena', 'atlas', 'aqua', 'sage', 'luca', 'felix', 'optimus'] as const;
export type HerneSpecialistId = (typeof HERNE_SPECIALIST_IDS)[number];
export const EXPECTED_RECORD_COUNT = 17;

export interface HerneSpecialistRelevance {
  priority: number;
  role: string;
}

export interface HerneEvidenceRecord {
  id: string;
  claim: string;
  document_text: string;
  herne: { primary_pillar: string; connected_pillars: string[] };
  evidence: Record<string, unknown>;
  specialist_relevance: Record<string, HerneSpecialistRelevance>;
  wearable_relevance: { direct_metrics: string[]; context_metrics: string[] };
  safety: { boundary?: string; human_review_when?: string[] };
  response_guidance: { causal_language?: string; personalisation_limit?: string; must_include?: string[] };
  version: string;
  status: string;
}

export interface ParsedLine {
  record: HerneEvidenceRecord;
  line: number;
}
export interface RejectedLine {
  line: number;
  recordId?: string | undefined;
  reason: string;
}
export interface ParseResult {
  valid: ParsedLine[];
  rejected: RejectedLine[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validate one parsed object as a HERNE evidence record. */
export function validate(obj: unknown): { ok: true; record: HerneEvidenceRecord } | { ok: false; reason: string } {
  if (!isRecord(obj)) return { ok: false, reason: 'not an object' };
  if (typeof obj.id !== 'string' || !obj.id.trim()) return { ok: false, reason: 'missing id' };
  if (typeof obj.claim !== 'string' || !obj.claim.trim()) return { ok: false, reason: 'missing claim' };
  if (typeof obj.document_text !== 'string' || !obj.document_text.trim()) return { ok: false, reason: 'missing document_text' };
  if (!isRecord(obj.herne) || typeof obj.herne.primary_pillar !== 'string') return { ok: false, reason: 'missing herne.primary_pillar' };
  if (!isRecord(obj.specialist_relevance)) return { ok: false, reason: 'missing specialist_relevance' };
  const rel = obj.specialist_relevance as Record<string, unknown>;
  const missing = HERNE_SPECIALIST_IDS.filter((s) => !isRecord(rel[s]));
  if (missing.length) return { ok: false, reason: `specialist_relevance missing: ${missing.join(', ')}` };
  if (typeof obj.version !== 'string') return { ok: false, reason: 'missing version' };
  if (typeof obj.status !== 'string') return { ok: false, reason: 'missing status' };
  return { ok: true, record: obj as unknown as HerneEvidenceRecord };
}

/** Parse the raw JSONL line-by-line, validating each atomically. */
export function parseRecords(jsonl: string = HERNE_KNOWLEDGE_JSONL): ParseResult {
  const lines = jsonl.split(/\r?\n/);
  const valid: ParsedLine[] = [];
  const rejected: RejectedLine[] = [];
  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed) return; // blank line — not a record
    const lineNo = i + 1;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      rejected.push({ line: lineNo, reason: 'invalid JSON' });
      return;
    }
    const result = validate(obj);
    if (result.ok) {
      valid.push({ record: result.record, line: lineNo });
    } else {
      const recordId = isRecord(obj) && typeof obj.id === 'string' ? obj.id : undefined;
      rejected.push({ line: lineNo, recordId, reason: result.reason });
    }
  });
  return { valid, rejected };
}

/** Map a record to its herne_evidence_records row. */
export function recordToRow(r: HerneEvidenceRecord): Record<string, unknown> {
  return {
    organisation_id: HERNE_ORG,
    record_id: r.id,
    claim: r.claim,
    document_text: r.document_text,
    primary_pillar: r.herne.primary_pillar,
    connected_pillars: r.herne.connected_pillars ?? [],
    evidence: r.evidence ?? {},
    specialist_relevance: r.specialist_relevance ?? {},
    wearable_relevance: r.wearable_relevance ?? {},
    safety: r.safety ?? {},
    response_guidance: r.response_guidance ?? {},
    version: r.version,
    status: r.status,
    updated_at: new Date().toISOString(),
  };
}
