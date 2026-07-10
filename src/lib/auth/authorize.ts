import 'server-only';

import { redirect } from 'next/navigation';
import { getSession, toAuthContext, type Session } from './session';
import { hasMinRole, type AppRole } from './roles';
import { hasPermission, hasAnyPermission } from './permissions';
import type { PermissionKey } from '@/config/permissions';
import { AuthenticationError, AuthorizationError } from '@/lib/security/errors';

/**
 * Server-side authorisation guards. Two flavours:
 *  • `require*` — for Server Components / route segments: redirect on failure.
 *  • `assert*`  — for Server Actions / handlers: throw a typed error the caller
 *                 converts into an ActionResult (no redirect side-effect).
 *  • `can`      — non-throwing boolean checks for conditional rendering.
 *
 * All are thin wrappers over the pure RBAC engine + the session seam, so the
 * exact same rules run in the UI and are re-enforced by RLS at the data layer.
 */

// ── Non-throwing checks (conditional UI) ─────────────────────────────────────

export async function currentRole(): Promise<AppRole> {
  const session = await getSession();
  return session?.user.role ?? 'guest';
}

export async function can(permission: PermissionKey): Promise<boolean> {
  const session = await getSession();
  return hasPermission(toAuthContext(session), permission);
}

export async function canAny(permissions: PermissionKey[]): Promise<boolean> {
  const session = await getSession();
  return hasAnyPermission(toAuthContext(session), permissions);
}

// ── require* — redirecting guards for pages / layouts ────────────────────────

/** Ensure a session exists, else redirect to login (optionally preserving a return path). */
export async function requireSession(returnTo?: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect(`/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''}`);
  }
  return session;
}

/** Ensure the user holds at least `minimum` role, else redirect. */
export async function requireRole(minimum: AppRole, returnTo?: string): Promise<Session> {
  const session = await requireSession(returnTo);
  if (!hasMinRole(session.user.role, minimum)) {
    redirect('/dashboard?denied=1');
  }
  return session;
}

/** Ensure the user holds `permission`, else redirect. */
export async function requirePermission(permission: PermissionKey, returnTo?: string): Promise<Session> {
  const session = await requireSession(returnTo);
  if (!hasPermission(toAuthContext(session), permission)) {
    redirect('/dashboard?denied=1');
  }
  return session;
}

// ── assert* — throwing guards for Server Actions / API handlers ──────────────

export async function assertSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  return session;
}

export async function assertRole(minimum: AppRole): Promise<Session> {
  const session = await assertSession();
  if (!hasMinRole(session.user.role, minimum)) throw new AuthorizationError();
  return session;
}

export async function assertPermission(permission: PermissionKey): Promise<Session> {
  const session = await assertSession();
  if (!hasPermission(toAuthContext(session), permission)) throw new AuthorizationError();
  return session;
}
