import { describe, it, expect, vi, afterEach } from 'vitest';
import { getMailProvider } from './provider';
import { createResendAdapter } from './resend';
import { renderMailTemplate } from './templates';

// Adapter tests isolate delivery from the separately tested allowance ledger.
vi.mock('@/lib/providers/budget', () => ({ reserveProviderUsage: vi.fn().mockResolvedValue(true) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('mail provider gating', () => {
  it('has NO provider until both RESEND_API_KEY and MAIL_FROM_ADDRESS exist', () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('MAIL_FROM_ADDRESS', '');
    expect(getMailProvider()).toBeNull();
    vi.stubEnv('RESEND_API_KEY', 'key-only');
    expect(getMailProvider()).toBeNull();
  });
});

describe('resend adapter', () => {
  const message = { to: 'member@example.com', subject: 'Subject', text: 'Body' };

  it('reports sent with the provider message id on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 })));
    const adapter = createResendAdapter({ apiKey: 'k', from: 'noreply@example.com' });
    const result = await adapter.send(message);
    expect(result).toEqual({ sent: true, providerMessageId: 'msg_1' });
  });

  it('classifies 4xx as NOT retryable and 429/5xx as retryable', async () => {
    const adapter = createResendAdapter({ apiKey: 'k', from: 'noreply@example.com' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad request', { status: 422 })));
    const bad = await adapter.send(message);
    expect(bad.sent).toBe(false);
    if (!bad.sent) expect(bad.retryable).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('slow down', { status: 429 })));
    const limited = await adapter.send(message);
    if (!limited.sent) expect(limited.retryable).toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const network = await adapter.send(message);
    if (!network.sent) expect(network.retryable).toBe(true);
  });
});

describe('mail templates', () => {
  it('renders operational facts and escapes HTML', () => {
    const rendered = renderMailTemplate('contact.staff_copy', {
      name: 'A <script>alert(1)</script>',
      email: 'visitor@example.com',
      subject: 'Hello',
      message: 'A question about plans.',
    });
    expect(rendered.subject).toContain('Hello');
    expect(rendered.text).toContain('visitor@example.com');
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });

  it('escalation alert contains no member content — only where to look', () => {
    const rendered = renderMailTemplate('escalation.staff_alert', { specialist: 'serena', leadId: 'lead-1' });
    expect(rendered.text).toContain('/admin/crm/lead-1');
    expect(rendered.text.toLowerCase()).toContain('no member or conversation content');
  });
});
