import { describe, it, expect, vi, afterEach } from 'vitest';
import { authorizeJobRequest } from './job-auth';

afterEach(() => vi.unstubAllEnvs());

describe('job runner authentication', () => {
  it('is honestly unavailable (not open) until CRON_SECRET is configured', () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(authorizeJobRequest('Bearer anything')).toBe('not_configured');
    expect(authorizeJobRequest(null)).toBe('not_configured');
  });

  it('accepts only the exact bearer secret', () => {
    vi.stubEnv('CRON_SECRET', 'super-secret');
    expect(authorizeJobRequest('Bearer super-secret')).toBe('ok');
    expect(authorizeJobRequest('Bearer wrong')).toBe('unauthorized');
    expect(authorizeJobRequest('super-secret')).toBe('unauthorized'); // missing Bearer scheme
    expect(authorizeJobRequest(null)).toBe('unauthorized');
    expect(authorizeJobRequest('Bearer ')).toBe('unauthorized');
  });
});
