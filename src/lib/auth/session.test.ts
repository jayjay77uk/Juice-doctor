import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ user: {} as Record<string, unknown>, profile: {} as Record<string, unknown> | null, overrides: [] as Record<string, unknown>[], error: false }));
vi.mock('react', () => ({ cache: (fn: unknown) => fn }));
vi.mock('@/lib/env', () => ({ isSupabaseConfigured: () => true }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => null }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => {
    const query = {
      select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: state.profile, error: null }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({ data: table === 'user_permission_overrides' ? state.overrides : [], error: state.error ? {} : null })),
    }; return query;
  },
}) }));
import { getSession } from './session';
beforeEach(() => {
  state.user = { id: 'member', email: 'verified@example.com', email_confirmed_at: '2026-01-01' };
  state.profile = { role: 'member', status: 'active', organisation_id: 'org', email: 'untrusted@example.com' };
  state.overrides = []; state.error = false;
});
describe('session authorization', () => {
  it.each(['suspended', 'deactivated', 'invited'])('rejects %s accounts', async status => {
    state.profile!.status = status;
    expect(await getSession()).toBeNull();
  });
  it('rejects unconfirmed addresses and missing profiles', async () => {
    state.user.email_confirmed_at = null;
    expect(await getSession()).toBeNull();
    state.user.email_confirmed_at = '2026-01-01'; state.profile = null;
    expect(await getSession()).toBeNull();
  });
  it('uses verified auth email and applies non-expired overrides', async () => {
    state.overrides = [
      { permission_key: 'users.read', effect: 'deny', expires_at: null },
      { permission_key: 'roles.assign', effect: 'grant', expires_at: '2000-01-01' },
    ];
    expect((await getSession())?.user).toMatchObject({ email: 'verified@example.com', grants: [], denies: ['users.read'] });
  });
  it('fails closed when override loading fails', async () => {
    state.error = true;
    expect(await getSession()).toBeNull();
  });
});
