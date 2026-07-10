/**
 * Auth barrel. Import roles/permissions helpers and guards from here.
 * Note: `session` and `authorize` are server-only; importing them into a client
 * component will (correctly) fail the build.
 */
export * from './roles';
export * from './permissions';
export { getSession, toAuthContext, type Session, type SessionUser } from './session';
export {
  can,
  canAny,
  currentRole,
  requireSession,
  requireRole,
  requirePermission,
  assertSession,
  assertRole,
  assertPermission,
} from './authorize';
