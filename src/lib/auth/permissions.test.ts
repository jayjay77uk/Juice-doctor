import { describe, it, expect } from 'vitest';
import {
  ROLE_PERMISSIONS,
  hasPermission,
  roleHasPermission,
  hasAnyPermission,
  hasAllPermissions,
  effectivePermissions,
} from './permissions';
import { hasMinRole, isAdminRole, APP_ROLES } from './roles';
import { ALL_PERMISSION_KEYS, ROLE_BASE_PERMISSIONS, type PermissionKey } from '@/config/permissions';

describe('RBAC engine', () => {
  it('super_administrator holds every permission (wildcard)', () => {
    for (const key of ALL_PERMISSION_KEYS) {
      expect(roleHasPermission('super_administrator', key)).toBe(true);
    }
    expect(ROLE_PERMISSIONS.super_administrator.size).toBe(ALL_PERMISSION_KEYS.length);
  });

  it('guest and member hold no catalogue permissions', () => {
    expect(ROLE_PERMISSIONS.guest.size).toBe(0);
    expect(ROLE_BASE_PERMISSIONS.member).toEqual([]);
    expect(ROLE_PERMISSIONS.member.size).toBe(0);
  });

  it('permissions are cumulative up the hierarchy (admin ⊇ staff)', () => {
    for (const key of ROLE_PERMISSIONS.staff) {
      expect(ROLE_PERMISSIONS.administrator.has(key)).toBe(true);
    }
    // and administrator is strictly at least as large as staff
    expect(ROLE_PERMISSIONS.administrator.size).toBeGreaterThanOrEqual(ROLE_PERMISSIONS.staff.size);
  });

  it('deny override always wins over a role grant', () => {
    const anyAdminPerm = [...ROLE_PERMISSIONS.administrator][0] as PermissionKey;
    expect(hasPermission({ role: 'administrator' }, anyAdminPerm)).toBe(true);
    expect(hasPermission({ role: 'administrator', denies: [anyAdminPerm] }, anyAdminPerm)).toBe(false);
    // deny beats grant too
    expect(hasPermission({ role: 'member', grants: [anyAdminPerm], denies: [anyAdminPerm] }, anyAdminPerm)).toBe(false);
  });

  it('explicit per-user grant elevates a member for one permission', () => {
    const perm = ALL_PERMISSION_KEYS[0] as PermissionKey;
    expect(hasPermission({ role: 'member' }, perm)).toBe(false);
    expect(hasPermission({ role: 'member', grants: [perm] }, perm)).toBe(true);
  });

  it('hasAny / hasAll behave correctly', () => {
    const a = ALL_PERMISSION_KEYS[0] as PermissionKey;
    const b = ALL_PERMISSION_KEYS[1] as PermissionKey;
    expect(hasAnyPermission({ role: 'super_administrator' }, [a, b])).toBe(true);
    expect(hasAnyPermission({ role: 'member' }, [a, b])).toBe(false);
    expect(hasAllPermissions({ role: 'super_administrator' }, [a, b])).toBe(true);
    expect(hasAllPermissions({ role: 'member', grants: [a] }, [a, b])).toBe(false);
  });

  it('effectivePermissions lists exactly what a context holds', () => {
    expect(effectivePermissions({ role: 'super_administrator' }).length).toBe(ALL_PERMISSION_KEYS.length);
    expect(effectivePermissions({ role: 'guest' })).toEqual([]);
  });
});

describe('role hierarchy', () => {
  it('is linear and cumulative', () => {
    expect(hasMinRole('administrator', 'staff')).toBe(true);
    expect(hasMinRole('staff', 'administrator')).toBe(false);
    expect(hasMinRole('member', 'member')).toBe(true);
    expect(isAdminRole('administrator')).toBe(true);
    expect(isAdminRole('member')).toBe(false);
  });

  it('covers every declared role', () => {
    expect(APP_ROLES).toContain('super_administrator');
    for (const role of APP_ROLES) expect(ROLE_PERMISSIONS[role]).toBeInstanceOf(Set);
  });
});
