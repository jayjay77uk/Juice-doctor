import { describe, it, expect, vi, afterEach } from 'vitest';
import { redactProps, analyticsId, safeErrorSummary } from './redact';
import { track } from './events';
import { captureServerError } from './capture';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('monitoring redaction', () => {
  it('drops forbidden keys and prose-length strings, keeps operational facts', () => {
    const safe = redactProps({
      content: 'my private health concern',
      message: 'free text',
      email: 'a@b.com',
      reason: 'sensitive reasoning',
      specialistSlug: 'serena',
      confidence: 0.82,
      escalate: true,
      longText: 'x'.repeat(200),
      nested: { deep: 'no' },
    });
    expect(safe).toEqual({ specialistSlug: 'serena', confidence: 0.82, escalate: true });
  });

  it('analytics identifiers are one-way hashes, never the raw user id', () => {
    const raw = '11111111-2222-3333-4444-555555555555';
    const hashed = analyticsId(raw);
    expect(hashed).not.toContain(raw.slice(0, 8));
    expect(hashed).toHaveLength(24);
    expect(analyticsId(raw)).toBe(hashed);
  });

  it('bounds error summaries', () => {
    const summary = safeErrorSummary(new Error('m'.repeat(500)));
    expect(summary.type).toBe('Error');
    expect(summary.message).toHaveLength(200);
  });
});

describe('event capture honesty', () => {
  it('is a silent no-op when PostHog is not configured — no network call', async () => {
    vi.stubEnv('POSTHOG_API_KEY', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await track('member.signed_in', {}, 'user-1');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends a redacted payload with a hashed identity when configured', async () => {
    vi.stubEnv('POSTHOG_API_KEY', 'ph-key');
    vi.stubEnv('POSTHOG_HOST', 'https://ph.example.com');
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await track('escalation.raised', { trigger: 'emergency', reason: 'should be dropped' }, 'user-1');
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://ph.example.com/capture/');
    const body = JSON.parse(String(init.body)) as { event: string; distinct_id: string; properties: Record<string, unknown> };
    expect(body.event).toBe('escalation.raised');
    expect(body.distinct_id).not.toBe('user-1');
    expect(body.properties).toEqual({ trigger: 'emergency' });
  });
});

describe('error capture honesty', () => {
  it('logs locally (no network) when Sentry is not configured', async () => {
    vi.stubEnv('SENTRY_DSN', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await captureServerError(new Error('boom'), { route: '/api/test' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('sends a bounded envelope to the DSN endpoint when configured', async () => {
    vi.stubEnv('SENTRY_DSN', 'https://publickey@o123.ingest.sentry.io/456');
    const fetchSpy = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await captureServerError(new Error('boom'), { route: '/api/test' });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe('https://o123.ingest.sentry.io/api/456/envelope/');
  });
});
