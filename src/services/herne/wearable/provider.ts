import 'server-only';

import type { RawMeasurement } from './normalise';

/**
 * Wearable provider abstraction. The platform is provider-agnostic: the ingest
 * engine, consent ledger, permissions, trends and AI-context builder all work
 * against this interface. There is NO implementation until a real provider
 * (Thryve) is credentialed — `getWearableProvider()` returns null and every
 * caller shows an honest "not connected" state. Nothing is ever simulated.
 */

export interface WearableConnectionResult {
  /** The provider's identifier for this user's connection. */
  externalConnectionId: string;
  /** Where to send the member to authorise the connection, if applicable. */
  authorisationUrl?: string;
}

export interface WearableProviderAdapter {
  readonly key: string;
  /** Begin a connection for a member (e.g. mint a Thryve session/token). */
  createConnection(userId: string): Promise<WearableConnectionResult>;
  /** Pull measurements for a connected member (initial/backfill sync). */
  fetchMeasurements(userId: string, since?: string): Promise<RawMeasurement[]>;
  /** Verify an incoming webhook's signature. */
  verifyWebhook(signature: string, payload: string): boolean;
  /** Parse a verified webhook payload into normalisable measurements. */
  parseWebhook(payload: string): { userId: string | null; measurements: RawMeasurement[] };
  /** Revoke the provider-side connection for a member. */
  revokeConnection(userId: string, externalConnectionId: string | null): Promise<void>;
}

/**
 * Required configuration for the live Thryve connection. All three must be
 * present before a provider is returned; they are read here and nowhere else.
 */
export function thryveConfig(): { apiKey: string; appId: string; webhookSecret: string } | null {
  const apiKey = process.env.THRYVE_API_KEY ?? '';
  const appId = process.env.THRYVE_APP_ID ?? '';
  const webhookSecret = process.env.THRYVE_WEBHOOK_SECRET ?? '';
  if (!apiKey || !appId || !webhookSecret) return null;
  return { apiKey, appId, webhookSecret };
}

/** True when a live wearable provider is fully credentialed. */
export function isWearableProviderConfigured(): boolean {
  return thryveConfig() !== null;
}

/**
 * The live provider adapter, or null when unconfigured. The Thryve HTTP
 * adapter is implemented HERE (and only here) once the client supplies
 * THRYVE_API_KEY, THRYVE_APP_ID and THRYVE_WEBHOOK_SECRET — no placeholder
 * implementation exists before then.
 */
export function getWearableProvider(): WearableProviderAdapter | null {
  const config = thryveConfig();
  if (!config) return null;
  // Implement the real Thryve adapter when credentials + API docs are supplied.
  // Deliberately unreachable until then (config is always null without creds).
  return null;
}
