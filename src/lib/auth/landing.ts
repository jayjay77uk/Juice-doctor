import { hasMinRole, type AppRole } from './roles';

/**
 * Where an authenticated user should land based on their role. Administrators
 * (and above) land on the admin dashboard; everyone else on the member
 * dashboard. This mirrors the (admin) route-group gate — `requireRole('administrator')`
 * — so a user is only ever sent to an area they can actually enter.
 */
export function landingForRole(role: AppRole): string {
  return hasMinRole(role, 'administrator') ? '/admin' : '/dashboard';
}

/**
 * Sanitise a `?next=` redirect target so it can only ever point at an internal
 * path (guards against open-redirect: `//evil.com`, `https://…`, backslashes,
 * or protocol-relative URLs). Returns the safe path, or null if it is not a
 * plain in-app absolute path.
 */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  // Must be an absolute in-app path.
  if (!value.startsWith('/')) return null;
  // Reject protocol-relative ("//host") and backslash tricks ("/\\host").
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  // Reject anything smuggling a scheme or control characters.
  if (/[\x00-\x1f]/.test(value) || value.includes('://')) return null;
  return value;
}

/** Resolve the landing target: a safe `next` wins, else the role default. */
export function resolveLanding(role: AppRole, next: unknown): string {
  return safeNextPath(next) ?? landingForRole(role);
}
