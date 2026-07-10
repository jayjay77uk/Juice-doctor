import 'server-only';

/**
 * Auth session seam — production-shaped from day one.
 *
 * `getSession()` is async and server-only. In the prototype it always resolves a
 * canned session so the dashboard/admin shells render with a name and role. In
 * production it reads httpOnly cookies via Supabase server-side, awaits token
 * refresh, and RLS enforces access. Route protection is written as a real async
 * check with `redirect()` where a gate is genuinely needed later — we never ship
 * the "render a restricted panel instead of redirecting" pattern.
 */

export type UserRole = 'member' | 'admin';

export interface Session {
  user: { name: string; email: string; role: UserRole };
}

const cannedSession: Session = {
  user: { name: 'Jordan Rivera', email: 'jordan@example.com', role: 'member' },
};

const cannedAdminSession: Session = {
  user: { name: 'Erran Warden', email: 'erran@askjuicedoctor.com', role: 'admin' },
};

export async function getSession(role: UserRole = 'member'): Promise<Session | null> {
  // Prototype: always "authenticated". Production: read + validate Supabase cookie.
  return role === 'admin' ? cannedAdminSession : cannedSession;
}
