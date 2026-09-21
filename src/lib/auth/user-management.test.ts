import { describe, expect, it } from 'vitest';
import { mayManageUser } from './user-management';
const actor = { id: 'admin', role: 'administrator' as const, organisationId: 'org' };
const member = { id: 'member', role: 'member' as const, organisationId: 'org' };
describe('user access management hierarchy', () => {
  it('allows subordinate changes in the same organisation', () => expect(mayManageUser(actor, member, 'staff')).toBe(true));
  it('rejects self changes', () => expect(mayManageUser(actor, actor, 'member')).toBe(false));
  it('rejects peers', () => expect(mayManageUser(actor, { ...actor, id: 'peer' }, 'member')).toBe(false));
  it('rejects peer promotions', () => expect(mayManageUser(actor, member, 'administrator')).toBe(false));
  it('rejects cross-organisation changes', () => expect(mayManageUser(actor, { ...member, organisationId: 'other' }, 'member')).toBe(false));
  it('rejects missing organisation', () => expect(mayManageUser({ ...actor, organisationId: null }, member, 'member')).toBe(false));
  it('rejects staff actors', () => expect(mayManageUser({ ...actor, role: 'staff' }, member, 'member')).toBe(false));
  it('protects the owner even from another owner', () => expect(mayManageUser({ ...actor, role: 'super_administrator' }, { ...member, role: 'super_administrator' }, 'member')).toBe(false));
});
