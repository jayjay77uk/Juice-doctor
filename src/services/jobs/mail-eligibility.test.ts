import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  email: true,
  status: 'active',
  payment: 'pending',
  confirmed: true,
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              email: 'member@example.com',
              email_confirmed_at: state.confirmed ? 'yes' : null,
            },
          },
          error: null,
        }),
      },
    },
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({
          error: null,
          data:
            table === 'user_preferences'
                  ? { email_notifications: state.email, preferences: { email_checkins_configured: true } }
              : table === 'profiles'
                ? { status: state.status }
                : table === 'payment_instalments'
                  ? { status: state.payment, due_date: '2026-01-01', plan_id: 'plan' }
                  : { status: 'active', member_id: '00000000-0000-0000-0000-000000000001' },
        }),
      };
      return q;
    },
  }),
}));
import { followUpMailEligible } from './mail-eligibility';
const key = 'checkin:00000000-0000-0000-0000-000000000001:2026-09-21';
beforeEach(() => {
  state.email = true;
  state.status = 'active';
  state.payment = 'pending';
  state.confirmed = true;
});
describe('queued reminder eligibility', () => {
  it('permits opted-in verified active recipients', async () =>
    expect(await followUpMailEligible('member.weekly_checkin', key, 'member@example.com')).toBe(
      true,
    ));
  it('blocks withdrawn preferences', async () => {
    state.email = false;
    expect(await followUpMailEligible('member.weekly_checkin', key, 'member@example.com')).toBe(
      false,
    );
  });
  it('blocks suspended accounts and changed recipient addresses', async () => {
    state.status = 'suspended';
    expect(await followUpMailEligible('member.weekly_checkin', key, 'member@example.com')).toBe(
      false,
    );
    state.status = 'active';
    expect(await followUpMailEligible('member.weekly_checkin', key, 'old@example.com')).toBe(false);
  });
  it('blocks already paid instalments', async () => {
    state.payment = 'paid';
    expect(
      await followUpMailEligible('payment.instalment_reminder', key, 'member@example.com'),
    ).toBe(false);
  });
  it('fails closed on missing identity metadata', async () =>
    expect(await followUpMailEligible('member.weekly_checkin', null, 'member@example.com')).toBe(
      false,
    ));
});
