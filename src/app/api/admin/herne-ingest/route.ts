import { NextResponse } from 'next/server';
import { getSession } from '@/services/auth';
import { hasMinRole } from '@/lib/auth/roles';
import { ingest, EXPECTED_RECORD_COUNT } from '@/services/herne/ingestion';
import { seedHerneSpecialists } from '@/services/herne/seed';
import { seedReferralRules } from '@/services/herne/referrals';

/**
 * Admin-gated trigger for the HERNE foundation setup: ingest the shared evidence
 * base + seed the eight specialists (config, DNA, starter prompts). Idempotent.
 * Administrator only.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || !hasMinRole(session.user.role, 'administrator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const evidence = await ingest();
  const specialists = await seedHerneSpecialists();
  const referrals = await seedReferralRules();
  return NextResponse.json({
    ok: evidence.expectedMet && evidence.persisted && specialists.specialists === 8 && referrals.count >= 15,
    expectedRecords: EXPECTED_RECORD_COUNT,
    evidence,
    specialists,
    referrals,
  });
}
