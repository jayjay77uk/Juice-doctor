import { wearableMetric } from './catalog';
import { normaliseMeasurement, type RawMeasurement, type NormalisedMeasurement } from './normalise';

/**
 * Provider adapter interface for FUTURE Thryve integration + a MOCK adapter for
 * this increment. No live Thryve credentials, no production endpoints — the mock
 * returns deterministic prototype fixtures so the whole wearable pipeline can be
 * built and tested now and Thryve can be dropped in later without redesign.
 */

export interface ProviderInfo {
  key: string;
  displayName: string;
  connected: boolean;
}
export interface ConnectionResult {
  connectionId: string;
  status: 'connected' | 'pending' | 'failed';
  provider: string;
}
export interface ConnectionStatus {
  connectionId: string;
  status: 'connected' | 'paused' | 'revoked' | 'disconnected' | 'error';
  lastSyncAt: string | null;
}
export interface WebhookResult {
  accepted: boolean;
  measurements: number;
}
export interface SyncResult {
  jobId: string;
  status: 'ok' | 'failed';
  fetched: number;
}

export interface WearableProviderAdapter {
  readonly key: string;
  readonly isMock: boolean;
  createConnection(userId: string): Promise<ConnectionResult>;
  revokeConnection(connectionId: string): Promise<boolean>;
  refreshConnection(connectionId: string): Promise<ConnectionStatus>;
  listProviders(): Promise<ProviderInfo[]>;
  fetchMeasurements(userId: string, opts?: { since?: string }): Promise<RawMeasurement[]>;
  receiveWebhook(payload: unknown): Promise<WebhookResult>;
  verifyWebhook(signature: string, body: string): boolean;
  normaliseMeasurement(raw: RawMeasurement): NormalisedMeasurement;
  retrySync(jobId: string): Promise<SyncResult>;
  getConnectionStatus(connectionId: string): Promise<ConnectionStatus>;
}

const FIXTURE_BASE: Record<string, number> = {
  sleep_duration: 430,
  steps: 8200,
  resting_heart_rate: 58,
  heart_rate_variability: 55,
  body_mass: 74,
  active_minutes: 38,
};

/** Deterministic prototype fixtures — ~14 days of readings for a few metrics. NOT live data. */
export function fixtureMeasurements(userId: string, days = 14): RawMeasurement[] {
  const out: RawMeasurement[] = [];
  for (let d = 0; d < days; d++) {
    // Fixed base date (deterministic; no Date.now in fixtures).
    const observedAt = new Date(Date.UTC(2026, 6, 1 + d, 7, 0, 0)).toISOString();
    for (const metricId of Object.keys(FIXTURE_BASE)) {
      const base = FIXTURE_BASE[metricId] ?? 0;
      const wobble = ((d * 7 + metricId.length) % 11) - 5; // deterministic
      const scale = metricId === 'steps' ? 140 : metricId === 'body_mass' ? 0.15 : 1;
      out.push({
        userId,
        metricId,
        value: Math.round((base + wobble * scale) * 100) / 100,
        unit: wearableMetric(metricId)?.unit ?? '',
        provider: 'thryve_mock',
        device: 'Mock Wearable',
        observedAt,
        timezone: 'Europe/London',
        confidence: 0.9,
      });
    }
  }
  return out;
}

export function createMockThryveAdapter(): WearableProviderAdapter {
  return {
    key: 'thryve',
    isMock: true,
    async createConnection(userId) {
      return { connectionId: `mock_conn_${userId.slice(0, 8)}`, status: 'connected', provider: 'thryve' };
    },
    async revokeConnection() {
      return true;
    },
    async refreshConnection(connectionId) {
      return { connectionId, status: 'connected', lastSyncAt: '2026-07-14T07:00:00.000Z' };
    },
    async listProviders() {
      return [{ key: 'thryve', displayName: 'Thryve (aggregator)', connected: false }];
    },
    async fetchMeasurements(userId) {
      return fixtureMeasurements(userId);
    },
    async receiveWebhook(payload) {
      const arr = Array.isArray(payload) ? payload : [];
      return { accepted: true, measurements: arr.length };
    },
    verifyWebhook(signature) {
      // Mock verification — a real adapter validates the Thryve HMAC signature.
      return signature === 'mock-signature';
    },
    normaliseMeasurement(raw) {
      return normaliseMeasurement(raw);
    },
    async retrySync(jobId) {
      return { jobId, status: 'ok', fetched: FIXTURE_BASE ? 6 : 0 };
    },
    async getConnectionStatus(connectionId) {
      return { connectionId, status: 'connected', lastSyncAt: '2026-07-14T07:00:00.000Z' };
    },
  };
}
