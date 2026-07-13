import 'server-only';

/**
 * Server-only environment access. Secrets are NEVER imported into client
 * components (this module throws at build time if bundled for the browser).
 * Public values (NEXT_PUBLIC_*) are read directly where the browser needs them.
 */

function num(value: string | undefined, fallback: number): number {
  const n = value != null && value !== '' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

/** AI_REQUEST_TIMEOUT accepts ms (>=1000) or seconds (<1000, multiplied up). */
function timeoutMs(value: string | undefined, fallback: number): number {
  const n = num(value, fallback);
  return n < 1000 ? n * 1000 : n;
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',

  // ── AI provider ────────────────────────────────────────────────────────────
  aiProvider: process.env.AI_PROVIDER ?? 'anthropic',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  // ANTHROPIC_DEFAULT_MODEL is preferred; AI_MODEL kept for back-compat.
  aiModel: process.env.ANTHROPIC_DEFAULT_MODEL ?? process.env.AI_MODEL ?? 'claude-sonnet-5',
  aiMaxInputTokens: num(process.env.AI_MAX_INPUT_TOKENS, 14_000),
  aiMaxOutputTokens: num(process.env.AI_MAX_OUTPUT_TOKENS, 1_024),
  aiRequestTimeoutMs: timeoutMs(process.env.AI_REQUEST_TIMEOUT, 60_000),
  aiDailyUserLimit: num(process.env.AI_DAILY_USER_LIMIT, 50),
  aiMonthlyUserLimit: num(process.env.AI_MONTHLY_USER_LIMIT, 500),
  // Prototype mode defaults ON — extra safety wording + simulated-data notices.
  aiPrototypeMode: bool(process.env.AI_PROTOTYPE_MODE, true),

  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3011',
} as const;

/** True when the app can talk to Supabase as the (RLS-scoped) user. */
export const isSupabaseConfigured = (): boolean => Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** True when the app has the service-role key for privileged server operations. */
export const isSupabaseAdminConfigured = (): boolean => Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

/** True when a real AI provider credential is present. */
export const isAiConfigured = (): boolean => Boolean(env.anthropicApiKey);

/**
 * Validate the AI environment. Returns the list of problems (empty = ok) so a
 * caller can surface a CLEAR error rather than a vague provider failure. Required
 * for live inference: ANTHROPIC_API_KEY when AI_PROVIDER is 'anthropic'.
 */
export function validateAiEnv(): string[] {
  const problems: string[] = [];
  if (env.aiProvider === 'anthropic') {
    if (!env.anthropicApiKey) problems.push('ANTHROPIC_API_KEY is required for live AI (AI_PROVIDER=anthropic).');
  } else {
    problems.push(`Unsupported AI_PROVIDER "${env.aiProvider}" — only "anthropic" is implemented.`);
  }
  if (env.aiMaxOutputTokens > 8_192) problems.push('AI_MAX_OUTPUT_TOKENS exceeds the safe ceiling (8192).');
  return problems;
}

/** Throw a clear, aggregated error when the AI environment is misconfigured. */
export function assertAiEnv(): void {
  const problems = validateAiEnv();
  if (problems.length) {
    throw new Error(`AI configuration error:\n- ${problems.join('\n- ')}`);
  }
}
