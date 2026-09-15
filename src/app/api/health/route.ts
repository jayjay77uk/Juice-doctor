import { NextResponse } from 'next/server';
import { isSupabaseConfigured, isSupabaseAdminConfigured, isAiConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Public health / readiness endpoint. Reports the running commit and whether
 * Supabase + the AI provider are configured, and exercises a live privileged DB
 * round-trip to prove connectivity. NEVER returns any secret value — only
 * booleans, the git SHA, and a DB status.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7);
  const vercelEnv = process.env.VERCEL_ENV ?? 'local';

  let db: { ok: boolean; error: string | null } = { ok: false, error: 'admin client not configured' };
  const admin = createAdminClient();
  if (admin) {
    try {
      const { error } = await admin.from('profiles').select('id').limit(1);
      db = { ok: !error, error: error ? 'database check failed' : null };
    } catch {
      db = { ok: false, error: 'database check failed' };
    }
  }

  const ready = isSupabaseConfigured() && isSupabaseAdminConfigured() && db.ok && isAiConfigured();
  return NextResponse.json({
    ok: ready,
    commit,
    vercelEnv,
    supabase: {
      configured: isSupabaseConfigured(),
      adminConfigured: isSupabaseAdminConfigured(),
      db,
    },
    ai: { configured: isAiConfigured() },
    time: new Date().toISOString(),
  }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
