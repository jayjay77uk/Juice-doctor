import { NextResponse, type NextRequest } from 'next/server';
import { getPaymentProvider } from '@/lib/payments/provider';
import { payments } from '@/services/payments';

/**
 * Payment provider webhook receiver. No payment provider is connected yet, so
 * this endpoint answers 503 — it never fakes acceptance and nothing can mark a
 * payment paid through it until a real provider adapter is credentialed. Once
 * connected: the adapter reads its own signature header, events are stored
 * idempotently (a replayed event is acknowledged but never re-processed; an
 * unfinished one is retried), then run through the payment event pipeline. Any
 * event that fails to process returns a non-2xx so the provider retries.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 1_000_000;

export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json(
      { error: 'Payment provider not configured. Select a provider, implement its adapter and set PAYMENT_PROVIDER plus its credentials.' },
      { status: 503 },
    );
  }

  // Bound the body BEFORE reading it (Content-Length), then again after.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }
  const payload = await request.text();
  if (payload.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const header = (name: string) => request.headers.get(name);
  if (!provider.verifyWebhook(payload, header)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const events = provider.parseWebhook(payload);
  const results = [];
  for (const event of events) {
    results.push(await payments.processProviderEvent(provider.key, event));
  }
  // If any event did not process (transient DB error, store unavailable),
  // return 5xx so the provider retries — never a silent 200 that suppresses
  // redelivery. Business-rule rejections (mismatch, unknown) are terminal 200s.
  const retryable = results.some((r) => !r.processed && (r.reason === 'event_store_unavailable' || r.reason === 'not_pending'));
  return NextResponse.json({ ok: !retryable, results }, { status: retryable ? 503 : 200 });
}
