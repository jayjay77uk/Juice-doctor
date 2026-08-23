import { NextResponse } from 'next/server';
import { getSelfieScanProvider } from '@/services/selfie-scan/provider';
import { selfieScanSessions } from '@/services/selfie-scan/sessions';

export const runtime = 'nodejs';

/**
 * Provider-neutral webhook endpoint. It stays unavailable until an approved
 * adapter exists. The adapter owns signature verification + payload parsing;
 * this route never accepts an unsigned generic JSON status update.
 */
export async function POST(request: Request) {
  const provider = getSelfieScanProvider();
  if (!provider) {
    return NextResponse.json({ ok: false, error: 'selfie_scan_provider_not_configured' }, { status: 503 });
  }
  try {
    const event = await provider.verifyAndParseWebhook(request);
    const updated = await selfieScanSessions.applyWebhook(provider.key, event);
    if (!updated) return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_selfie_scan_webhook' }, { status: 401 });
  }
}
