import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ ledger: null as null | { granted: boolean }, error: false, answers: { consentHealth: true, sharePractitioner: true } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (table: string) => {
  const query = {
    select: () => query, eq: () => query, order: () => query, limit: () => query,
    maybeSingle: async () => ({ data: table === 'user_consents' ? state.ledger : { answers: state.answers }, error: state.error ? {} : null }),
  }; return query;
} }) }));
import { hasConsent } from './consents';
beforeEach(() => { state.ledger = null; state.error = false; state.answers = { consentHealth: true, sharePractitioner: true }; });
describe('consent decisions', () => {
  it('honours original onboarding choices when there is no ledger entry', async () => {
    expect(await hasConsent('member', 'health_data_sharing')).toBe(true);
    state.answers.sharePractitioner = false;
    expect(await hasConsent('member', 'health_data_sharing')).toBe(false);
  });
  it('withdrawal overrides prior onboarding permission', async () => {
    state.ledger = { granted: false };
    expect(await hasConsent('member', 'ai_processing')).toBe(false);
    expect(await hasConsent('member', 'health_data_sharing')).toBe(false);
  });
  it('fails closed on storage errors', async () => {
    state.error = true;
    expect(await hasConsent('member', 'health_data_sharing')).toBe(false);
  });
});
