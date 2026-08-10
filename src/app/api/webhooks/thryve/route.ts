import { NextResponse, type NextRequest } from 'next/server';
import { getWearableProvider, isWearableProviderConfigured } from '@/services/herne/wearable/provider';
import { ingestMeasurements } from '@/services/herne/wearable/ingest';

/**
 * Thryve webhook receiver. Until the provider is credentialed
 * (THRYVE_API_KEY / THRYVE_APP_ID / THRYVE_WEBHOOK_SECRET) this endpoint
 * answers 503 — it never fakes acceptance. Once configured: signature is
 * verified, the payload is parsed by the provider adapter, and measurements
 * flow through the idempotent ingest engine (consent-checked, validated,
 * duplicate-safe).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isWearableProviderConfigured()) {
    return NextResponse.json(
      { error: 'Wearable provider not configured. Requires THRYVE_API_KEY, THRYVE_APP_ID and THRYVE_WEBHOOK_SECRET.' },
      { status: 503 },
    );
  }
  const provider = getWearableProvider();
  if (!provider) {
    return NextResponse.json({ error: 'Wearable provider adapter unavailable.' }, { status: 503 });
  }

  const payload = await request.text();
  if (payload.length > 1_000_000) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }
  const signature = request.headers.get('x-thryve-signature') ?? request.headers.get('x-signature') ?? '';
  if (!signature || !provider.verifyWebhook(signature, payload)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const parsed = provider.parseWebhook(payload);
  if (!parsed.userId || !parsed.measurements.length) {
    // Verified but nothing ingestible — acknowledge so the provider stops retrying.
    return NextResponse.json({ ok: true, stored: 0 });
  }
  const result = await ingestMeasurements(parsed.userId, parsed.measurements, provider.key);
  return NextResponse.json({ ok: true, stored: result.stored, duplicates: result.duplicates, consent: result.consent });
}
