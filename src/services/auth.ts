import 'server-only';

/**
 * Back-compat re-export. The auth session seam moved to `src/lib/auth/session.ts`
 * as part of the Phase-2 RBAC layer. Existing imports of `@/services/auth`
 * continue to work; new code should import from `@/lib/auth`.
 */
export { getSession, toAuthContext, type Session, type SessionUser } from '@/lib/auth/session';
export type { AppRole } from '@/lib/auth/roles';
