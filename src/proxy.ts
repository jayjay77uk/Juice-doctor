import { NextResponse, type NextRequest } from 'next/server';
import { buildContentSecurityPolicy, securityHeaders } from '@/lib/security/headers';
import { isSameOrigin } from '@/lib/security/csrf';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Edge middleware (Next 16 `proxy` convention). On every matched request it:
 *   1. Rejects cross-origin mutating requests (CSRF Origin check).
 *   2. Refreshes the Supabase auth session and PROTECTS the (dashboard)/(admin)
 *      route groups — unauthenticated users are redirected to /login. Protection
 *      is active whenever Supabase is configured (as on the deployed platform);
 *      with no Supabase configured (local without keys) it degrades to open so
 *      local development still renders.
 *   3. Applies the security-header baseline.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/practitioner'];
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function withSecurityHeaders(response: NextResponse, isHttps: boolean, nonce: string): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production';
  const headersToSet = securityHeaders({ hsts: isHttps, dev: isDev, nonce });
  for (const [key, value] of Object.entries(headersToSet)) response.headers.set(key, value);
  return response;
}

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const { nextUrl, method, headers } = request;
  const isHttps = nextUrl.protocol === 'https:';
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', buildContentSecurityPolicy({ nonce, dev: process.env.NODE_ENV !== 'production' }));
  const path = nextUrl.pathname;

  // 1. CSRF: mutating requests must be same-origin.
  if (MUTATING_METHODS.has(method)) {
    const origin = headers.get('origin');
    const host = headers.get('host');
    if (origin && !isSameOrigin(origin, host)) {
      return withSecurityHeaders(new NextResponse('Cross-origin request blocked', { status: 403 }), isHttps, nonce);
    }
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  // 2. Session refresh + route protection (real, when Supabase is configured).
  if (supabaseConfigured) {
    const { response, user } = await updateSession(request);
    if (isProtected && !user) {
      const loginUrl = new URL('/login', nextUrl);
      loginUrl.searchParams.set('next', path);
      return withSecurityHeaders(NextResponse.redirect(loginUrl), isHttps, nonce);
    }
    return withSecurityHeaders(response, isHttps, nonce);
  }

  // No Supabase configured (local dev without keys) — render openly, headers only.
  return withSecurityHeaders(NextResponse.next({ request }), isHttps, nonce);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)'],
};
