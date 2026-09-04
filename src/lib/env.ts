import 'server-only';
function num(value: string | undefined, fallback: number): number { const n = value != null && value !== '' ? Number(value) : NaN; return Number.isFinite(n) && n > 0 ? n : fallback; }
function str(value: string | undefined): string | undefined { const v = value?.trim(); return v ? v : undefined; }
function timeoutMs(value: string | undefined, fallback: number): number { const n = num(value, fallback); return n < 1000 ? n * 1000 : n; }
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  aiProvider: str(process.env.AI_PROVIDER) ?? 'anthropic', anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '', aiModel: str(process.env.ANTHROPIC_DEFAULT_MODEL) ?? str(process.env.AI_MODEL) ?? 'claude-sonnet-5', aiMaxInputTokens: num(process.env.AI_MAX_INPUT_TOKENS, 14_000), aiMaxOutputTokens: num(process.env.AI_MAX_OUTPUT_TOKENS, 1_024), aiRequestTimeoutMs: timeoutMs(process.env.AI_REQUEST_TIMEOUT, 60_000), aiDailyUserLimit: num(process.env.AI_DAILY_USER_LIMIT, 50), aiMonthlyUserLimit: num(process.env.AI_MONTHLY_USER_LIMIT, 500),
  siteUrl: str(process.env.NEXT_PUBLIC_SITE_URL) ?? (str(process.env.VERCEL_PROJECT_PRODUCTION_URL) ? `https://${str(process.env.VERCEL_PROJECT_PRODUCTION_URL)}` : undefined) ?? (str(process.env.VERCEL_URL) ? `https://${str(process.env.VERCEL_URL)}` : undefined) ?? 'http://localhost:3011',
} as const;
export const isMailConfigured = (): boolean => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM_ADDRESS);
export const isSttConfigured = (): boolean => Boolean(process.env.DEEPGRAM_API_KEY);
/** TTS needs only the provider key; a known free premade voice is used when no voice ID is configured. */
export const isTtsConfigured = (): boolean => Boolean(process.env.ELEVENLABS_API_KEY);
export const isSentryConfigured = (): boolean => Boolean(process.env.SENTRY_DSN);
export const isPosthogConfigured = (): boolean => Boolean(process.env.POSTHOG_API_KEY);
export const isCronConfigured = (): boolean => Boolean(process.env.CRON_SECRET);
export const isSupabaseConfigured = (): boolean => Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isSupabaseAdminConfigured = (): boolean => Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
export const isAiConfigured = (): boolean => Boolean(env.anthropicApiKey);
export function validateAiEnv(): string[] { const problems: string[] = []; if (env.aiProvider === 'anthropic') { if (!env.anthropicApiKey) problems.push('ANTHROPIC_API_KEY is required for live AI (AI_PROVIDER=anthropic).'); } else problems.push(`Unsupported AI_PROVIDER "${env.aiProvider}" — only "anthropic" is implemented.`); if (env.aiMaxOutputTokens > 8_192) problems.push('AI_MAX_OUTPUT_TOKENS exceeds the safe ceiling (8192).'); return problems; }
export function assertAiEnv(): void { const problems = validateAiEnv(); if (problems.length) throw new Error(`AI configuration error:\n- ${problems.join('\n- ')}`); }