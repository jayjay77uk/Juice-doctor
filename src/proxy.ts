import { NextResponse, type NextRequest } from 'next/server';
import { securityHeaders } from '@/lib/security/headers';
import { isSameOrigin } from '@/lib/security/csrf';
import { config as appConfig } from '@/config/app';

/**
 * Edge middleware (Next 16 `proxy` convention, formerly middleware.ts).
 * Runs on every matched request and does three things:
 *   1. Applies the security-header baseline (src/lib/security/headers.ts).
 *   2. Rejects cross-origin mutating requests (CSRF Origin check).
 *   3. Protects the (dashboard)/(admin) route groups.
 *
 * Production-shaped: the route-protection block reads the Supabase auth cookie
 * and redirects unauthenticated users to /login. In the PROTOTYPE there is no
 * real auth cookie and the dashboards are demo shells, so protection is bypassed
 * (the production code path is present and commented, not deleted).
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

export default function proxy(request: NextRequest): NextResponse {
  const { nextUrl, method, headers } = request;
  const isHttps = nextUrl.protocol === 'https:';

  // 2. CSRF: mutating requests must be same-origin.
  if (MUTATING_METHODS.has(method)) {
    const origin = headers.get('origin');
    const host = headers.get('host');
    if (origin && !isSameOrigin(origin, host)) {
      return new NextResponse('Cross-origin request blocked', { status: 403 });
    }
  }

  // 3. Route protection.
  const path = nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (isProtected && !appConfig.isPrototype) {
    // Production: require an auth session cookie, else redirect to login.
    const hasSession = request.cookies.has('sb-access-token') || request.cookies.has('sb:token');
    if (!hasSession) {
      const loginUrl = new URL('/login', nextUrl);
      loginUrl.searchParams.set('next', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 1. Attach security headers to the response.
  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV !== 'production';
  const headersToSet = securityHeaders({ hsts: isHttps && !appConfig.isPrototype, dev: isDev });
  for (const [key, value] of Object.entries(headersToSet)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)'],
};
