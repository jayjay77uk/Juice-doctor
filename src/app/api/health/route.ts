import { NextResponse } from 'next/server';
import { isSupabaseConfigured, isSupabaseAdminConfigured, isAiConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Public health / readiness endpoint — the deployment-verification instrument.
 * Reports the running commit + whether Supabase and the AI provider are
 * configured, and exercises a live DB round-trip (service role) to prove
 * connectivity. NEVER returns any secret value — only booleans and the git SHA.
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
      // A minimal privileged round-trip that needs a valid service-role key + DB.
      const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      db = { ok: !error, error: error?.message ?? null };
    } catch (e) {
      db = { ok: false, error: e instanceof Error ? e.message : 'db check failed' };
    }
  }

  return NextResponse.json({
    ok: true,
    commit,
    vercelEnv,
    supabase: {
      configured: isSupabaseConfigured(),
      adminConfigured: isSupabaseAdminConfigured(),
      db,
    },
    ai: { configured: isAiConfigured() },
    time: new Date().toISOString(),
  });
}
