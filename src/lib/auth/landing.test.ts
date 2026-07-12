import { describe, it, expect } from 'vitest';
import { landingForRole, safeNextPath, resolveLanding } from './landing';

describe('landingForRole', () => {
  it('sends administrators and super admins to /admin', () => {
    expect(landingForRole('administrator')).toBe('/admin');
    expect(landingForRole('super_administrator')).toBe('/admin');
  });

  it('sends everyone below administrator to /dashboard', () => {
    expect(landingForRole('member')).toBe('/dashboard');
    expect(landingForRole('practitioner')).toBe('/dashboard');
    expect(landingForRole('staff')).toBe('/dashboard');
    expect(landingForRole('guest')).toBe('/dashboard');
  });
});

describe('safeNextPath', () => {
  it('accepts plain internal paths', () => {
    expect(safeNextPath('/admin')).toBe('/admin');
    expect(safeNextPath('/admin/crm?status=new')).toBe('/admin/crm?status=new');
    expect(safeNextPath('/dashboard/subscriptions')).toBe('/dashboard/subscriptions');
  });

  it('rejects open-redirect and non-path inputs', () => {
    expect(safeNextPath('//evil.com')).toBeNull();
    expect(safeNextPath('https://evil.com')).toBeNull();
    expect(safeNextPath('/\\evil.com')).toBeNull();
    expect(safeNextPath('http://x')).toBeNull();
    expect(safeNextPath('javascript:alert(1)')).toBeNull();
    expect(safeNextPath('admin')).toBeNull();
    expect(safeNextPath('')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(42)).toBeNull();
  });
});

describe('resolveLanding', () => {
  it('prefers a safe next over the role default', () => {
    expect(resolveLanding('member', '/dashboard/goals')).toBe('/dashboard/goals');
    expect(resolveLanding('administrator', '/admin/users')).toBe('/admin/users');
  });

  it('falls back to the role default for unsafe or missing next', () => {
    expect(resolveLanding('administrator', '//evil.com')).toBe('/admin');
    expect(resolveLanding('administrator', undefined)).toBe('/admin');
    expect(resolveLanding('member', null)).toBe('/dashboard');
  });
});
