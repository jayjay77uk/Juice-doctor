import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ enabled: true, error: false }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({
          data: [{ key: 'ai.chat', enabled: state.enabled }],
          error: state.error ? {} : null,
        }),
      }),
    }),
  }),
}));
beforeEach(() => {
  vi.resetModules();
  state.enabled = true;
  state.error = false;
});
describe('runtime capability controls', () => {
  it('uses persisted chat state', async () => {
    state.enabled = false;
    const { featureFlags } = await import('./feature-flags');
    expect(await featureFlags.isEnabled('ai.chat')).toBe(false);
  });
  it('fails closed when storage cannot be read', async () => {
    state.error = true;
    const { featureFlags } = await import('./feature-flags');
    expect(await featureFlags.isEnabled('ai.chat')).toBe(false);
  });
  it('does not enable capabilities without implementations', async () => {
    const { featureFlags } = await import('./feature-flags');
    expect(await featureFlags.isEnabled('commerce.checkout')).toBe(false);
    await expect(featureFlags.toggle('knowledge.vector_search')).rejects.toThrow('not connected');
  });
});
