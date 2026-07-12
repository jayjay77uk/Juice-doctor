import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseAdminConfigured } from '@/lib/env';

/**
 * Service-role Supabase client — bypasses RLS. SERVER-ONLY, used only for
 * privileged operations that have already passed an application permission
 * check. Never import into client code. Returns null if not configured.
 */
export function createAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
