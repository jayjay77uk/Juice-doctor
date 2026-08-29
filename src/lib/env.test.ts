import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('env — blank values are treated as unset (dashboard artifact hardening)', () => {
  it('a blank ANTHROPIC_DEFAULT_MODEL falls through to the default model', async () => {
    // Regression: production had ANTHROPIC_DEFAULT_MODEL saved as an empty
    // string, `'' ?? fallback` kept the empty string, and every AI call sent
    // model:"" — instantly rejected. Blank must mean unset.
    vi.stubEnv('ANTHROPIC_DEFAULT_MODEL', '');
    vi.stubEnv('AI_MODEL', '  ');
    const { env } = await import('./env');
    expect(env.aiModel).toBe('claude-sonnet-5');
  });

  it('a blank AI_PROVIDER falls back to anthropic', async () => {
    vi.stubEnv('AI_PROVIDER', '');
    const { env, validateAiEnv } = await import('./env');
    expect(env.aiProvider).toBe('anthropic');
    void validateAiEnv;
  });

  it('a blank NEXT_PUBLIC_SITE_URL falls through the origin chain', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'example-app.vercel.app');
    const { env } = await import('./env');
    expect(env.siteUrl).toBe('https://example-app.vercel.app');
  });

  it('set values still win', async () => {
    vi.stubEnv('ANTHROPIC_DEFAULT_MODEL', 'claude-opus-5');
    const { env } = await import('./env');
    expect(env.aiModel).toBe('claude-opus-5');
  });
});
