import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  parseRecords,
  recordToRow,
  HERNE_ORG,
  EXPECTED_RECORD_COUNT,
  type RejectedLine,
} from './records';

export { EXPECTED_RECORD_COUNT, HERNE_SPECIALIST_IDS, parseRecords } from './records';
export type { HerneEvidenceRecord, HerneSpecialistId } from './records';

/**
 * HERNE evidence ingestion — the deterministic DB command that loads the ONE
 * shared evidence foundation into herne_evidence_records. Idempotent by
 * (organisation_id, record_id) with version-aware updates; every action is
 * audited; scientific claims are stored verbatim. Pure parsing/validation lives
 * in records.ts (unit-tested).
 */

export interface IngestReport {
  runId: string | null;
  totalLines: number;
  valid: number;
  rejected: RejectedLine[];
  inserted: number;
  updated: number;
  unchanged: number;
  expectedCount: number;
  expectedMet: boolean;
  persisted: boolean;
}

/** Run the ingestion against the DB (idempotent). Writes audit events + returns a report. */
export async function ingest(): Promise<IngestReport> {
  const { valid, rejected } = parseRecords();
  const base: IngestReport = {
    runId: null,
    totalLines: valid.length + rejected.length,
    valid: valid.length,
    rejected,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    expectedCount: EXPECTED_RECORD_COUNT,
    expectedMet: valid.length === EXPECTED_RECORD_COUNT,
    persisted: false,
  };

  const sb = createAdminClient();
  if (!sb) return base; // no DB (local) — validation-only report

  const runId = crypto.randomUUID();
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  const audit: Record<string, unknown>[] = [];

  for (const { record, line } of valid) {
    const existing = await sb
      .from('herne_evidence_records')
      .select('id, version')
      .eq('organisation_id', HERNE_ORG)
      .eq('record_id', record.id)
      .maybeSingle();
    let action: string;
    if (!existing.data) {
      await sb.from('herne_evidence_records').insert(recordToRow(record));
      inserted += 1;
      action = 'inserted';
    } else if (String(existing.data.version) !== record.version) {
      await sb.from('herne_evidence_records').update(recordToRow(record)).eq('id', existing.data.id);
      updated += 1;
      action = 'updated';
    } else {
      unchanged += 1;
      action = 'unchanged';
    }
    audit.push({ run_id: runId, record_id: record.id, line_number: line, action, version: record.version });
  }
  for (const rj of rejected) {
    audit.push({ run_id: runId, record_id: rj.recordId ?? null, line_number: rj.line, action: 'rejected', detail: rj.reason });
  }
  if (audit.length) await sb.from('herne_ingestion_audit').insert(audit);

  return { ...base, runId, inserted, updated, unchanged, persisted: true };
}

let ingestAttempted = false;

/** Lazily ensure the shared evidence foundation is loaded (idempotent, once per instance). */
export async function ensureIngested(): Promise<void> {
  if (ingestAttempted) return;
  const sb = createAdminClient();
  if (!sb) return;
  const { count, error } = await sb
    .from('herne_evidence_records')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', HERNE_ORG);
  if (error) return;
  if ((count ?? 0) >= EXPECTED_RECORD_COUNT) {
    ingestAttempted = true;
    return;
  }
  const report = await ingest();
  if (report.persisted && report.valid >= EXPECTED_RECORD_COUNT) ingestAttempted = true;
}
