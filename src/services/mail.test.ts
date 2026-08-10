import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendTemplateMail } from './mail';

afterEach(() => vi.unstubAllEnvs());

describe('mail service honesty', () => {
  it('never claims delivery when no provider is configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('MAIL_FROM_ADDRESS', '');
    const result = await sendTemplateMail({
      to: 'member@example.com',
      template: 'account.welcome',
      params: { name: 'Member' },
    });
    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('not_configured');
  });
});
