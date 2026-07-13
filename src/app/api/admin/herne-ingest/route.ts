import { NextResponse } from 'next/server';
import { getSession } from '@/services/auth';
import { hasMinRole } from '@/lib/auth/roles';
import { ingest, EXPECTED_RECORD_COUNT } from '@/services/herne/ingestion';

/**
 * Admin-gated trigger for the HERNE evidence ingestion command. Idempotent —
 * re-running upserts by record id + version and re-reports. Administrator only.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || !hasMinRole(session.user.role, 'administrator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const report = await ingest();
  return NextResponse.json({
    ok: report.expectedMet && report.persisted,
    expected: EXPECTED_RECORD_COUNT,
    report,
  });
}
