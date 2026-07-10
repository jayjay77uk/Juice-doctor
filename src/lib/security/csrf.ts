/**
 * CSRF strategy.
 *
 * Next.js Server Actions are POST-only and same-origin by design, and the app
 * uses Supabase auth cookies with `SameSite=Lax`, which blocks the classic
 * cross-site form-POST vector. On top of that baseline we adopt the
 * double-submit-cookie pattern for any custom (non-Action) mutating endpoint:
 * a random token is set as a cookie AND echoed in a header; the server requires
 * them to match. This module is the token utility; enforcement lives in
 * proxy.ts (Origin check) and per-route handlers.
 */

const TOKEN_BYTES = 32;
export const CSRF_COOKIE = '__Host-ajd-csrf';
export const CSRF_HEADER = 'x-ajd-csrf';

/** Generate a cryptographically strong token (Web Crypto — edge-compatible). */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison to avoid timing side-channels. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Validate a double-submit pair. Both must be present and equal. */
export function verifyDoubleSubmit(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) return false;
  return safeEqual(cookieToken, headerToken);
}

/**
 * Same-origin check used by middleware for mutating requests. A missing Origin
 * on a same-origin GET is fine; on a mutating request we require Origin to match
 * the site host.
 */
export function isSameOrigin(requestOrigin: string | null, host: string | null): boolean {
  if (!requestOrigin || !host) return false;
  try {
    return new URL(requestOrigin).host === host;
  } catch {
    return false;
  }
}
