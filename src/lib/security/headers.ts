/**
 * Security headers applied to every response (via proxy.ts middleware).
 *
 * A strict, documented baseline. The CSP is intentionally conservative; when a
 * feature needs a new source it is added here with a comment, never loosened
 * globally. `'unsafe-inline'` for styles is required by the CSS-in-JS/inline
 * critical CSS approach; scripts use a nonce in production (wired in proxy.ts).
 */

export interface SecurityHeaderOptions {
  /** Per-request nonce for inline scripts (set by middleware). */
  nonce?: string;
  /** Send HSTS (only over HTTPS in production). */
  hsts?: boolean;
}

export function buildContentSecurityPolicy(nonce?: string): string {
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'unsafe-inline'`; // dev/prototype fallback
  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    // Supabase + Resend endpoints are added here when wired (Phase 2/3).
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

export function securityHeaders(options: SecurityHeaderOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Security-Policy': buildContentSecurityPolicy(options.nonce),
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
