import 'server-only';

import { isMailConfigured } from '@/lib/env';
import { createResendAdapter } from './resend';

/**
 * Mail provider abstraction. The application composes and records email through
 * `src/services/mail.ts`; only this seam knows which provider delivers it.
 * Until RESEND_API_KEY + MAIL_FROM_ADDRESS are supplied (final connection
 * stage) there is NO provider and every send is recorded as blocked — the app
 * never claims an email was sent.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export type MailSendResult =
  | { sent: true; providerMessageId: string | null }
  | { sent: false; retryable: boolean; error: string };

export interface MailProviderAdapter {
  /** Stable identifier recorded on outbox rows ('resend'). */
  readonly key: string;
  send(message: MailMessage, opts?: { signal?: AbortSignal }): Promise<MailSendResult>;
}

/** The configured provider, or null when email is not yet connected. */
export function getMailProvider(): MailProviderAdapter | null {
  if (!isMailConfigured()) return null;
  return createResendAdapter({
    apiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.MAIL_FROM_ADDRESS ?? '',
  });
}
