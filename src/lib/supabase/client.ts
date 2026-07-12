'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client (anon key only — safe to expose). Used for
 * client-side auth flows (sign in/out) and realtime. RLS enforces access.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
}
