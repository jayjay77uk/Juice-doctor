import { describe, it, expect, vi, afterEach } from 'vitest';
import { thryveConfig, isWearableProviderConfigured, getWearableProvider } from './provider';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('wearable provider gating', () => {
  it('is unconfigured (null provider) when any Thryve credential is missing', () => {
    vi.stubEnv('THRYVE_API_KEY', '');
    vi.stubEnv('THRYVE_APP_ID', '');
    vi.stubEnv('THRYVE_WEBHOOK_SECRET', '');
    expect(thryveConfig()).toBeNull();
    expect(isWearableProviderConfigured()).toBe(false);
    expect(getWearableProvider()).toBeNull();

    // Partial configuration is still unconfigured — all three are required.
    vi.stubEnv('THRYVE_API_KEY', 'k');
    expect(thryveConfig()).toBeNull();
    expect(isWearableProviderConfigured()).toBe(false);
  });

  it('credentials alone do NOT report configured — the adapter must exist too', () => {
    vi.stubEnv('THRYVE_API_KEY', 'k');
    vi.stubEnv('THRYVE_APP_ID', 'a');
    vi.stubEnv('THRYVE_WEBHOOK_SECRET', 's');
    expect(thryveConfig()).toEqual({ apiKey: 'k', appId: 'a', webhookSecret: 's' });
    // The contract-dependent Thryve adapter is not implemented yet, so the
    // integration must keep reporting "not configured" even with all three
    // credentials set — status can never go green over a null adapter.
    expect(getWearableProvider()).toBeNull();
    expect(isWearableProviderConfigured()).toBe(false);
  });
});
