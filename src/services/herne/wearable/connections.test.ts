import { describe, it, expect, vi, afterEach } from 'vitest';
import { createConnectState, verifyConnectState } from './connections';

afterEach(() => vi.unstubAllEnvs());

const USER = '11111111-2222-3333-4444-555555555555';

function configure() {
  vi.stubEnv('THRYVE_API_KEY', 'k');
  vi.stubEnv('THRYVE_APP_ID', 'a');
  vi.stubEnv('THRYVE_WEBHOOK_SECRET', 'secret-1');
}

describe('wearable connect state', () => {
  it('cannot mint or verify state until the provider is credentialed', () => {
    vi.stubEnv('THRYVE_API_KEY', '');
    vi.stubEnv('THRYVE_APP_ID', '');
    vi.stubEnv('THRYVE_WEBHOOK_SECRET', '');
    expect(createConnectState(USER)).toBeNull();
    expect(verifyConnectState('anything')).toBeNull();
  });

  it('round-trips a valid state and rejects tampering', () => {
    configure();
    const state = createConnectState(USER);
    expect(state).not.toBeNull();
    expect(verifyConnectState(state!)).toBe(USER);

    // Tampered user id fails the HMAC.
    const parts = state!.split('.');
    const forged = [`99999999-2222-3333-4444-555555555555`, parts[1], parts[2]].join('.');
    expect(verifyConnectState(forged)).toBeNull();
    // A different secret invalidates previously minted state.
    vi.stubEnv('THRYVE_WEBHOOK_SECRET', 'rotated');
    expect(verifyConnectState(state!)).toBeNull();
  });

  it('rejects expired state', () => {
    configure();
    const state = createConnectState(USER)!;
    const [uid, , sig] = state.split('.') as [string, string, string];
    const expired = `${uid}.${Date.now() - 1000}.${sig}`;
    expect(verifyConnectState(expired)).toBeNull();
  });
});
