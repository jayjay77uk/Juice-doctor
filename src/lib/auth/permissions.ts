import { APP_ROLES, ROLE_RANK, type AppRole } from './roles';
import {
  ROLE_BASE_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from '@/config/permissions';

/**
 * The RBAC engine. Turns the role hierarchy + base-permission map into an
 * effective permission set per role, then answers authorisation questions.
 * Pure and dependency-free, so it can run on the server, in middleware, and in
 * tests. Data-layer RLS enforces the same rules independently (defence in depth).
 */

/**
 * Effective permissions per role, computed once: each role receives the union of
 * its own base permissions and those of every lower-ranked role. The
 * super_administrator receives ALL permissions (wildcard).
 */
export const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<PermissionKey>> = (() => {
  const ordered = [...APP_ROLES].sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b]);
  const result = {} as Record<AppRole, Set<PermissionKey>>;
  const accumulated = new Set<PermissionKey>();
  for (const role of ordered) {
    for (const perm of ROLE_BASE_PERMISSIONS[role]) accumulated.add(perm);
    result[role] = new Set(accumulated);
  }
  // Super administrator holds every permission, including any added later.
  result.super_administrator = new Set(ALL_PERMISSION_KEYS);
  return result;
})();

/** A user's authorisation context, independent of how it was obtained. */
export interface AuthContext {
  role: AppRole;
  /** Per-user overrides layered on the role defaults (deny always wins). */
  grants?: PermissionKey[];
  denies?: PermissionKey[];
}

/** Does this role, by itself, hold the permission? */
export function roleHasPermission(role: AppRole, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

/**
 * The effective decision for a full auth context: a deny override always wins;
 * otherwise a role grant OR an explicit user grant allows it.
 */
export function hasPermission(ctx: AuthContext, permission: PermissionKey): boolean {
  if (ctx.denies?.includes(permission)) return false;
  if (roleHasPermission(ctx.role, permission)) return true;
  return ctx.grants?.includes(permission) ?? false;
}

/** True only if the context holds every listed permission. */
export function hasAllPermissions(ctx: AuthContext, permissions: PermissionKey[]): boolean {
  return permissions.every((p) => hasPermission(ctx, p));
}

/** True if the context holds at least one of the listed permissions. */
export function hasAnyPermission(ctx: AuthContext, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => hasPermission(ctx, p));
}

/** The full list of permissions a context effectively holds (for admin UIs). */
export function effectivePermissions(ctx: AuthContext): PermissionKey[] {
  return ALL_PERMISSION_KEYS.filter((p) => hasPermission(ctx, p));
}
