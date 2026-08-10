/**
 * Security headers applied to every response (via proxy.ts middleware).
 *
 * A strict, documented baseline. The CSP is intentionally conservative; when a
 * feature needs a new source it is added here with a comment, never loosened
 * globally. `'unsafe-inline'` for styles is required by the CSS-in-JS/inline
 * critical CSS approach. proxy.ts does not currently supply a nonce, so
 * production script-src falls back to `'self' 'unsafe-inline'` (the nonce
 * branch below is ready if one is wired later).
 */

export interface SecurityHeaderOptions {
  /** Per-request nonce for inline scripts (set by middleware). */
  nonce?: string;
  /** Send HSTS (only over HTTPS in production). */
  hsts?: boolean;
  /** Development mode — relaxes script-src so React dev tooling (which uses eval) works. */
  dev?: boolean;
}

/** The Supabase project origin (public URL), for CSP connect-src. */
function supabaseOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  try {
    return url ? new URL(url).origin : '';
  } catch {
    return '';
  }
}

export function buildContentSecurityPolicy(options: { nonce?: string; dev?: boolean } = {}): string {
  const { nonce, dev } = options;
  const scriptSrc = dev
    ? `'self' 'unsafe-inline' 'unsafe-eval'` // dev only: React dev mode needs eval
    : nonce
      ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `'self' 'unsafe-inline'`;
  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    // Same-origin XHR/fetch PLUS the Supabase origin: the password-reset flow
    // (forgot/reset forms) calls Supabase Auth from the browser via the
    // anon-key client — without this the call is CSP-blocked and no reset
    // email is ever dispatched (verified on production 2026-08-10).
    `connect-src 'self'${supabaseOrigin() ? ` ${supabaseOrigin()}` : ''}`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

export function securityHeaders(options: SecurityHeaderOptions = {}): Record<string, string> {
  const cspOptions: { nonce?: string; dev?: boolean } = {};
  if (options.nonce) cspOptions.nonce = options.nonce;
  if (options.dev) cspOptions.dev = options.dev;
  const headers: Record<string, string> = {
    'Content-Security-Policy': buildContentSecurityPolicy(cspOptions),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-DNS-Prefetch-Control': 'off',
    // Lock down powerful features by default.
    'Permissions-Policy': [
      'camera=(self)', // Remote Selfie Scan uses the camera on its own origin
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'interest-cohort=()',
    ].join(', '),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (options.hsts) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }
  return headers;
}
