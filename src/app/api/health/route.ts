import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, isSupabaseAdminConfigured, isAiConfigured, env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAiProvider } from '@/lib/ai';

/**
 * Public health / readiness endpoint — the deployment-verification instrument.
 * Reports the running commit + whether Supabase and the AI provider are
 * configured, and exercises a live DB round-trip (service role) to prove
 * connectivity. NEVER returns any secret value — only booleans and the git SHA.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

  // Opt-in live AI probe (?ai=1): exercises a minimal real completion so a
  // provider/model misconfiguration is diagnosable. Never returns the key.
  let aiProbe: { ok: boolean; model: string; error: string | null } | undefined;
  if (request.nextUrl.searchParams.get('ai') === '1') {
    aiProbe = { ok: false, model: env.aiModel, error: 'provider not configured' };
    const provider = getAiProvider();
    if (provider) {
      try {
        const res = await provider.chat({ messages: [{ role: 'user', content: 'ping' }], maxTokens: 5 });
        aiProbe = { ok: true, model: res.model, error: null };
      } catch (e) {
        const cause = e instanceof Error && 'cause' in e ? (e as { cause?: unknown }).cause : undefined;
        const causeMsg = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '';
        aiProbe = {
          ok: false,
          model: env.aiModel,
          error: `${e instanceof Error ? e.message : 'ai probe failed'}${causeMsg ? ` — ${causeMsg}` : ''}`,
        };
      }
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
    ai: { configured: isAiConfigured(), ...(aiProbe ? { probe: aiProbe } : {}) },
    time: new Date().toISOString(),
  });
}
