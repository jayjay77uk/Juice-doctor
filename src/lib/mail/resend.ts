import { reserveProviderUsage } from '@/lib/providers/budget';
import 'server-only';

import type { MailMessage, MailProviderAdapter, MailSendResult } from './provider';

/**
 * Resend adapter — real HTTPS calls to the documented Resend REST API
 * (https://resend.com/docs/api-reference/emails/send-email). Constructed only
 * by `getMailProvider()` once RESEND_API_KEY + MAIL_FROM_ADDRESS exist; it is
 * never instantiated with placeholder credentials.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 15_000;

export function createResendAdapter(config: { apiKey: string; from: string }): MailProviderAdapter {
  return {
    key: 'resend',
    async send(message: MailMessage, opts?: { signal?: AbortSignal }): Promise<MailSendResult> {
      if (!(await reserveProviderUsage('resend'))) return { sent: false, retryable: true, error: 'free_allowance_unavailable' };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      const onCallerAbort = () => controller.abort();
      opts?.signal?.addEventListener('abort', onCallerAbort, { once: true });
      try {
        const res = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: config.from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            ...(message.html ? { html: message.html } : {}),
            ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          }),
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.ok) {
          const body = (await res.json().catch(() => null)) as { id?: string } | null;
          return { sent: true, providerMessageId: body?.id ?? null };
        }
        // 4xx = our request/config is wrong (not retryable); 5xx/429 = retryable.
        const retryable = res.status === 429 || res.status >= 500;
        const detail = await res.text().catch(() => '');
        return { sent: false, retryable, error: `resend_http_${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}` };
      } catch (e) {
        return { sent: false, retryable: true, error: e instanceof Error ? `resend_network: ${e.message.slice(0, 300)}` : 'resend_network' };
      } finally {
        clearTimeout(timer);
        opts?.signal?.removeEventListener('abort', onCallerAbort);
      }
    },
  };
}
