import { NextResponse, type NextRequest } from 'next/server';
import { getPaymentProvider } from '@/lib/payments/provider';
import { payments } from '@/services/payments';

/**
 * Payment provider webhook receiver. No payment provider is connected yet, so
 * this endpoint answers 503 — it never fakes acceptance and nothing can mark a
 * payment paid through it until a real provider adapter is credentialed. Once
 * connected: signature verified, events stored idempotently (duplicate events
 * are acknowledged but never re-processed), then run through the payment event
 * pipeline (`payments.processProviderEvent`).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json(
      { error: 'Payment provider not configured. Select a provider, implement its adapter and set PAYMENT_PROVIDER plus its credentials.' },
      { status: 503 },
    );
  }

  const payload = await request.text();
  if (payload.length > 1_000_000) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }
  const signature = request.headers.get('x-webhook-signature') ?? request.headers.get('x-signature') ?? '';
  if (!signature || !provider.verifyWebhook(signature, payload)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const events = provider.parseWebhook(payload);
  const results = [];
  for (const event of events) {
    results.push(await payments.processProviderEvent(provider.key, event));
  }
  return NextResponse.json({ ok: true, results });
}
