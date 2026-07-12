import 'server-only';

/**
 * Server-only environment access. Secrets are NEVER imported into client
 * components (this module throws at build time if bundled for the browser).
 * Public values (NEXT_PUBLIC_*) are read directly where the browser needs them.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  aiModel: process.env.AI_MODEL ?? 'claude-sonnet-5',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3011',
} as const;

/** True when the app can talk to Supabase as the (RLS-scoped) user. */
export const isSupabaseConfigured = (): boolean => Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** True when the app has the service-role key for privileged server operations. */
export const isSupabaseAdminConfigured = (): boolean => Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

/** True when a real AI provider credential is present. */
export const isAiConfigured = (): boolean => Boolean(env.anthropicApiKey);
