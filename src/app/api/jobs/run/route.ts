import { NextResponse, type NextRequest } from 'next/server';
import { authorizeJobRequest } from '@/lib/security/job-auth';
import { runJobs, JOBS } from '@/services/jobs/registry';
import { auditRepo } from '@/services/repositories/audit-repo';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Background-job runner — invoked by the external scheduler (Vercel Cron; see
 * vercel.json). Secured with CRON_SECRET (503 until configured — connecting
 * the scheduler is a final-stage configuration step). Every run is recorded:
 * job_runs table when migration 0031 is applied, audit log always. Jobs never
 * fake work — see src/services/jobs/registry.ts.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handle(request: NextRequest): Promise<NextResponse> {
  const auth = authorizeJobRequest(request.headers.get('authorization'));
  if (auth === 'not_configured') {
    return NextResponse.json({ error: 'Job runner not configured. Set CRON_SECRET and point the scheduler at this endpoint.' }, { status: 503 });
  }
  if (auth === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const only = request.nextUrl.searchParams.get('job') ?? undefined;
  if (only && !JOBS[only]) {
    return NextResponse.json({ error: `Unknown job "${only}". Jobs: ${Object.keys(JOBS).join(', ')}.` }, { status: 400 });
  }
  const startedAt = new Date().toISOString();
  const results = await runJobs(only);

  // Durable run record — job_runs (0031) when available, audit log always.
  const sb = createAdminClient();
  if (sb) {
    try {
      await sb.from('job_runs').insert({
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        results,
        trigger: request.headers.get('x-vercel-cron') ? 'vercel-cron' : 'manual',
      });
    } catch {
      // table may not exist yet — the audit record below still lands
    }
  }
  await auditRepo.log({
    actorId: null,
    action: 'jobs.run',
    entityType: 'job_runs',
    after: { results: results.map((r) => `${r.name}: ${r.status} (${r.processed})`) },
  });

  return NextResponse.json({ ok: true, startedAt, results });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
