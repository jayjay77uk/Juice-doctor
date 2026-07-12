import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/services/auth';
import { resolveLanding, safeNextPath } from '@/lib/auth/landing';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Post-authentication landing resolver.
 *
 * `signIn`/`register` set the session cookie on their OWN response, but within
 * that same server-action request the Supabase client still reads the session
 * from the (pre-login) request cookies — so the role cannot be resolved there.
 * They therefore redirect here. This handler runs on the NEXT request, where the
 * session cookie is present, so getSession() resolves the real role and we send
 * the user to the area they can actually enter (administrators → /admin).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const nextParam = request.nextUrl.searchParams.get('next');
  const origin = request.nextUrl.origin;

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/dashboard', origin));
  }

  const session = await getSession();
  if (!session) {
    const loginUrl = new URL('/login', origin);
    const safe = safeNextPath(nextParam);
    if (safe) loginUrl.searchParams.set('next', safe);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(resolveLanding(session.user.role, nextParam), origin));
}
