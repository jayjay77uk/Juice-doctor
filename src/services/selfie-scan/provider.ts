import 'server-only';

/**
 * Provider contract for Remote Selfie Scan. Deliberately no vendor adapter is
 * invented here: the client has not selected/supplied a provider contract yet.
 * Once selected, one adapter implements this interface; the rest of the app,
 * database lifecycle and webhook route stay unchanged.
 */
export interface SelfieScanLaunch {
  provider: string;
  providerSessionId: string;
  launchUrl: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SelfieScanWebhookEvent {
  providerSessionId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  resultSummary?: Record<string, unknown>;
  failureCode?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SelfieScanProviderAdapter {
  readonly key: string;
  createSession(input: { userId: string; callbackUrl: string; returnUrl: string }): Promise<SelfieScanLaunch>;
  verifyAndParseWebhook(request: Request): Promise<SelfieScanWebhookEvent>;
  cancelSession?(providerSessionId: string): Promise<void>;
}

/**
 * No provider is selected today. Keep this null rather than shipping a fake
 * contract or accepting unsigned callback payloads. A future vendor adapter is
 * registered here only after its official API/webhook contract is available.
 */
export function getSelfieScanProvider(): SelfieScanProviderAdapter | null {
  return null;
}

export function selfieScanProviderStatus(): { configured: boolean; provider: string | null } {
  const provider = getSelfieScanProvider();
  return { configured: Boolean(provider), provider: provider?.key ?? null };
}
