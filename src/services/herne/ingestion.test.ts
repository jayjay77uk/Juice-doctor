import { describe, it, expect } from 'vitest';
import { parseRecords, EXPECTED_RECORD_COUNT, HERNE_SPECIALIST_IDS } from './records';
import { HERNE_KNOWLEDGE_JSONL } from '@/data/herne/knowledge-records';

describe('HERNE evidence ingestion', () => {
  it('parses exactly 17 valid records with 0 rejected', () => {
    const { valid, rejected } = parseRecords();
    expect(rejected).toEqual([]);
    expect(valid.length).toBe(EXPECTED_RECORD_COUNT);
    expect(valid.length).toBe(17);
  });

  it('preserves atomic record identity + required structure (one shared foundation)', () => {
    const { valid } = parseRecords();
    const ids = new Set(valid.map((v) => v.record.id));
    expect(ids.size).toBe(17); // every record id is unique + preserved
    for (const { record } of valid) {
      expect(record.id).toMatch(/^HERNE-/);
      expect(record.claim.length).toBeGreaterThan(0);
      expect(record.document_text.length).toBeGreaterThan(0);
      expect(record.herne.primary_pillar.length).toBeGreaterThan(0);
      expect(record.version.length).toBeGreaterThan(0);
      // every record scores all eight specialists — the shared base is enforced
      for (const s of HERNE_SPECIALIST_IDS) {
        const rel = record.specialist_relevance[s];
        expect(rel).toBeTruthy();
        expect(typeof rel?.priority).toBe('number');
      }
    }
  });

  it('rejects malformed lines WITHOUT dropping valid records (atomicity)', () => {
    const withBad = `${HERNE_KNOWLEDGE_JSONL.trimEnd()}\n{ this is not valid json }\n{"id":"X","claim":"c"}`;
    const { valid, rejected } = parseRecords(withBad);
    expect(valid.length).toBe(17); // the 17 good records survive intact
    expect(rejected.length).toBe(2);
    expect(rejected.some((r) => r.reason === 'invalid JSON')).toBe(true);
    expect(rejected.some((r) => r.recordId === 'X')).toBe(true); // reported by id
    expect(rejected.every((r) => typeof r.line === 'number')).toBe(true); // reported by line
  });

  it('does not alter scientific claims (stored verbatim)', () => {
    const { valid } = parseRecords();
    const h001 = valid.find((v) => v.record.id === 'HERNE-H-001');
    expect(h001?.record.claim).toContain('Adequate water intake is essential');
    expect(h001?.record.herne.primary_pillar).toBe('Hydration');
  });
});
