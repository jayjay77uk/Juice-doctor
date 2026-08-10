import { NextResponse, type NextRequest } from 'next/server';
import { isWearableProviderConfigured } from '@/services/herne/wearable/provider';
import { verifyConnectState, markConnectionActive } from '@/services/herne/wearable/connections';
import { env } from '@/lib/env';

/**
 * Thryve authorisation callback. Architecture is complete — signed-state
 * verification (HMAC, 15-minute expiry, keyed with the webhook secret) and
 * pending→active promotion — but the endpoint answers 503 until the provider
 * is credentialed. CONTRACT-REQUIRED: the exact callback query parameters
 * Thryve sends are confirmed against the official API contract at the final
 * connection stage; only the `state` parameter (ours) is interpreted here.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isWearableProviderConfigured()) {
    return NextResponse.json(
      { error: 'Wearable provider not configured. Requires THRYVE_API_KEY, THRYVE_APP_ID and THRYVE_WEBHOOK_SECRET.' },
      { status: 503 },
    );
  }
  const state = request.nextUrl.searchParams.get('state') ?? '';
  const userId = state ? verifyConnectState(state) : null;
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired connection state.' }, { status: 401 });
  }
  const activated = await markConnectionActive(userId);
  const destination = new URL('/dashboard/connected-health', env.siteUrl);
  destination.searchParams.set('connected', activated ? '1' : '0');
  return NextResponse.redirect(destination);
}
