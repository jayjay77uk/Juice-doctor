import 'server-only';

/**
 * Payment provider abstraction. The client has not yet selected a payment
 * provider, so `getPaymentProvider()` returns null and NOTHING simulates a
 * charge: payments exist only as admin-recorded manual ledger entries, and no
 * subscription or instalment is ever marked paid automatically.
 *
 * FINAL CONNECTION STAGE: implement the chosen provider's adapter behind this
 * interface (checkout/verify/parse/refund), set PAYMENT_PROVIDER plus the
 * provider's credentials, and the webhook route + event pipeline in
 * `src/services/payments.ts` — already built and tested — go live without
 * redesigning the payment domain.
 */

/** A verified, normalised event from the provider's webhook. */
export interface PaymentEvent {
  /** The provider's unique event id — the idempotency key for processing. */
  externalEventId: string;
  type: 'payment_succeeded' | 'payment_failed' | 'payment_refunded';
  providerPaymentId: string;
  amountMinor: number | null;
  currency: string | null;
  /** Our payment reference echoed back by the provider, when supplied at checkout. */
  reference: string | null;
}

export interface PaymentProviderAdapter {
  /** Stable identifier recorded on ledger rows and webhook events. */
  readonly key: string;
  /** Verify a webhook's authenticity (signature/HMAC per provider contract). */
  verifyWebhook(signature: string, payload: string): boolean;
  /** Parse a VERIFIED webhook payload into normalised events. */
  parseWebhook(payload: string): PaymentEvent[];
  /** Request a provider-side refund for a provider payment id. */
  refund(providerPaymentId: string): Promise<{ ok: boolean; error?: string }>;
}

/** True once a provider is selected AND credentialed. */
export function isPaymentProviderConfigured(): boolean {
  return getPaymentProvider() !== null;
}

/**
 * The live payment provider, or null. PAYMENT_PROVIDER names the selected
 * provider; until an adapter for that provider is implemented and credentialed
 * this returns null and the platform stays manual-records-only.
 */
export function getPaymentProvider(): PaymentProviderAdapter | null {
  // No provider adapter exists yet — the client has not chosen a provider.
  // Implement the adapter here (and only here) at the final connection stage.
  return null;
}
