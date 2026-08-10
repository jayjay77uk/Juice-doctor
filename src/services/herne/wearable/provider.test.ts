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

  it('reports configured only when all three credentials are present', () => {
    vi.stubEnv('THRYVE_API_KEY', 'k');
    vi.stubEnv('THRYVE_APP_ID', 'a');
    vi.stubEnv('THRYVE_WEBHOOK_SECRET', 's');
    expect(thryveConfig()).toEqual({ apiKey: 'k', appId: 'a', webhookSecret: 's' });
    expect(isWearableProviderConfigured()).toBe(true);
  });
});
