import 'server-only';

import { isSentryConfigured } from '@/lib/env';
import { safeErrorSummary } from './redact';

/**
 * Server error capture. With SENTRY_DSN set, errors go to Sentry's documented
 * envelope endpoint (no SDK dependency — swap in @sentry/nextjs at the final
 * connection stage if richer traces are wanted); without it they log to the
 * server console only. Error payloads carry the error class, a bounded
 * message and route context — never request bodies or member content.
 */

const CAPTURE_TIMEOUT_MS = 3_000;

interface ParsedDsn {
  endpoint: string;
  publicKey: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, '');
    if (!url.username || !projectId) return null;
    return { endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`, publicKey: url.username };
  } catch {
    return null;
  }
}

export async function captureServerError(error: unknown, context: { route?: string; kind?: string } = {}): Promise<void> {
  const summary = safeErrorSummary(error);
  if (!isSentryConfigured()) {
    console.error(`[capture] ${summary.type}: ${summary.message}`, context.route ?? '');
    return;
  }
  const dsn = parseDsn(process.env.SENTRY_DSN ?? '');
  if (!dsn) return;

  const eventId = crypto.randomUUID().replace(/-/g, '');
  const timestamp = new Date().toISOString();
  const event = {
    event_id: eventId,
    timestamp,
    platform: 'node',
    level: 'error',
    exception: { values: [{ type: summary.type, value: summary.message }] },
    tags: { ...(context.route ? { route: context.route } : {}), ...(context.kind ? { kind: context.kind } : {}) },
  };
  const envelope =
    `${JSON.stringify({ event_id: eventId, sent_at: timestamp, dsn: process.env.SENTRY_DSN })}\n` +
    `${JSON.stringify({ type: 'event' })}\n` +
    `${JSON.stringify(event)}\n`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);
  try {
    await fetch(dsn.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=ajd-server/1.0`,
      },
      body: envelope,
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    // error capture must never throw
  } finally {
    clearTimeout(timer);
  }
}
