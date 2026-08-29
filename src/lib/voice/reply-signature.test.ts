import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('receptionist reply signatures', () => {
  it('round-trips a genuine reply and rejects tampering', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-secret-key');
    const { signReply, verifyReplySignature } = await import('./reply-signature');
    const sig = signReply('Hello, I am Makela.');
    expect(sig).toBeTruthy();
    expect(verifyReplySignature('Hello, I am Makela.', sig!)).toBe(true);
    // Any change to the text invalidates it — the public TTS endpoint can
    // never be made to speak text the platform did not generate.
    expect(verifyReplySignature('Hello, I am Makela!', sig!)).toBe(false);
    expect(verifyReplySignature('Hello, I am Makela.', 'forged')).toBe(false);
    expect(verifyReplySignature('Hello, I am Makela.', '')).toBe(false);
  });

  it('signs nothing without server secret material', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const { signReply, verifyReplySignature } = await import('./reply-signature');
    expect(signReply('text')).toBeNull();
    expect(verifyReplySignature('text', 'anything')).toBe(false);
  });
});
