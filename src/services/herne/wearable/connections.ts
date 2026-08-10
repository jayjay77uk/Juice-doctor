import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from '../records';
import { wearableConsent } from './store';
import { getWearableProvider, thryveConfig } from './provider';
import { ingestMeasurements } from './ingest';
import { auditRepo } from '../../repositories/audit-repo';

/**
 * Wearable connection lifecycle over user_wearable_connections. Connecting
 * requires a live, credentialed provider — there is no other path to a
 * 'connected' row. Disconnecting revokes consent, revokes the provider-side
 * connection where one exists, and DELETES the member's stored wearable data
 * (measurements, quality flags, trends) — revocation means removal, not
 * retention.
 */

const ORG = HERNE_ORG;

export interface WearableConnection {
  status: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
}

export async function getConnection(userId: string): Promise<WearableConnection | null> {
  const sb = createAdminClient();
  if (!sb) return null;
  const { data } = await sb
    .from('user_wearable_connections')
    .select('status, connected_at, last_sync_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    status: String(data.status),
    connectedAt: (data.connected_at as string | null) ?? null,
    lastSyncAt: (data.last_sync_at as string | null) ?? null,
  };
}

/**
 * Begin a real provider connection for a member. Returns an honest
 * unavailable result until the provider is credentialed.
 */
export async function connectWearable(userId: string): Promise<{ ok: boolean; authorisationUrl?: string; error?: string }> {
  const provider = getWearableProvider();
  if (!provider) {
    return { ok: false, error: 'Wearable connections are not available yet — the device provider is not connected.' };
  }
  const sb = createAdminClient();
  if (!sb) return { ok: false, error: 'Not available right now.' };
  // Already connected? Nothing to do — never stack rows.
  const existing = await getConnection(userId);
  if (existing?.status === 'active') return { ok: false, error: 'A device is already connected.' };
  const result = await provider.createConnection(userId);
  // Reuse a stale pending row (abandoned/re-started flow) instead of inserting
  // a second — duplicate pending rows would break activation. Consent is NOT
  // granted here: it is granted only when the connection actually activates
  // (see markConnectionActive), so an abandoned flow leaves no standing consent.
  if (existing?.status === 'pending') {
    await sb
      .from('user_wearable_connections')
      .update({ external_connection_id: result.externalConnectionId, provider_key: provider.key })
      .eq('user_id', userId)
      .eq('status', 'pending');
  } else {
    await sb.from('user_wearable_connections').insert({
      organisation_id: ORG,
      user_id: userId,
      provider_key: provider.key,
      status: 'pending',
      external_connection_id: result.externalConnectionId,
    });
  }
  return { ok: true, ...(result.authorisationUrl ? { authorisationUrl: result.authorisationUrl } : {}) };
}

/** Disconnect: revoke consent + provider connection, delete stored data. */
export async function disconnectWearable(userId: string): Promise<{ ok: boolean; deleted: number }> {
  const sb = createAdminClient();
  if (!sb) return { ok: false, deleted: 0 };

  const { data: conn } = await sb
    .from('user_wearable_connections')
    .select('id, provider_key, external_connection_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const provider = getWearableProvider();
  if (provider && conn) {
    try {
      await provider.revokeConnection(userId, (conn.external_connection_id as string | null) ?? null);
    } catch {
      // Provider-side revocation is best-effort; local revocation proceeds.
    }
  }

  await wearableConsent.revoke(userId, (conn?.provider_key as string | undefined) ?? 'thryve');
  if (conn?.id) {
    await sb.from('user_wearable_connections').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', conn.id);
  }

  // Deletion on revocation: the member's wearable data does not linger.
  const { count } = await sb.from('wearable_measurements').delete({ count: 'exact' }).eq('user_id', userId);
  await sb.from('wearable_data_quality_flags').delete().eq('user_id', userId);
  await sb.from('wearable_trend_summaries').delete().eq('user_id', userId);

  await auditRepo.log({
    actorId: userId,
    action: 'wearable.disconnected',
    entityType: 'user_wearable_connections',
    entityId: conn?.id ? String(conn.id) : null,
    after: { label: `Consent revoked; ${count ?? 0} measurement(s) deleted` },
  });
  return { ok: true, deleted: count ?? 0 };
}

/**
 * Signed state for the provider authorisation callback — HMAC over the user id
 * and an expiry, keyed with the webhook secret. Null until the provider is
 * credentialed: no secret, no state, no callback.
 */
const CONNECT_STATE_TTL_MS = 15 * 60_000;

export function createConnectState(userId: string): string | null {
  const config = thryveConfig();
  if (!config) return null;
  const expires = Date.now() + CONNECT_STATE_TTL_MS;
  const payload = `${userId}.${expires}`;
  const sig = createHmac('sha256', config.webhookSecret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyConnectState(state: string): string | null {
  const config = thryveConfig();
  if (!config) return null;
  const parts = state.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, sig] = parts as [string, string, string];
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  const expected = createHmac('sha256', config.webhookSecret).update(`${userId}.${expiresRaw}`).digest('hex');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

/**
 * Mark the member's pending connection active (authorisation callback) and
 * grant sharing consent at this point — not at initiation — so an abandoned
 * flow never leaves standing consent. Resilient to more than one pending row
 * (updates them all rather than erroring on a non-singular result), so a stale
 * duplicate can never brick activation.
 */
export async function markConnectionActive(userId: string): Promise<boolean> {
  const sb = createAdminClient();
  if (!sb) return false;
  const provider = getWearableProvider();
  const { data, error } = await sb
    .from('user_wearable_connections')
    .update({ status: 'active', connected_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('id, provider_key');
  if (error || !data || data.length === 0) return false;
  await wearableConsent.grant(userId, String(data[0]?.provider_key ?? provider?.key ?? 'thryve'));
  await auditRepo.log({ actorId: userId, action: 'wearable.connected', entityType: 'user_wearable_connections', entityId: String(data[0]?.id) });
  return true;
}

/**
 * Pull-and-ingest for one member — admin resync and scheduled sync both use
 * this. Honest failure until the provider is credentialed; every run goes
 * through the consent-checked, idempotent ingest engine.
 */
export async function resyncForUser(userId: string): Promise<{ ok: boolean; stored: number; error?: string }> {
  const provider = getWearableProvider();
  if (!provider) {
    return { ok: false, stored: 0, error: 'The wearable provider is not connected — resync requires live Thryve credentials.' };
  }
  const connection = await getConnection(userId);
  if (!connection || connection.status !== 'active') {
    return { ok: false, stored: 0, error: 'This member has no active wearable connection.' };
  }
  try {
    const since = connection.lastSyncAt ?? undefined;
    const measurements = await provider.fetchMeasurements(userId, since);
    const result = await ingestMeasurements(userId, measurements, `${provider.key}:resync`);
    const sb = createAdminClient();
    if (sb) {
      await sb.from('user_wearable_connections').update({ last_sync_at: new Date().toISOString() }).eq('user_id', userId).eq('status', 'active');
    }
    return { ok: true, stored: result.stored };
  } catch (e) {
    return { ok: false, stored: 0, error: e instanceof Error ? e.message.slice(0, 200) : 'Resync failed.' };
  }
}

/** Admin list of member connections (operational metadata only). */
export async function listConnections(limit = 50): Promise<{ userId: string; email: string; status: string; connectedAt: string | null; lastSyncAt: string | null }[]> {
  const sb = createAdminClient();
  if (!sb) return [];
  const { data } = await sb
    .from('user_wearable_connections')
    .select('user_id, status, connected_at, last_sync_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const emails = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await sb.from('profiles').select('id, email').in('id', userIds);
    for (const p of profiles ?? []) emails.set(String(p.id), String(p.email ?? ''));
  }
  return rows.map((r) => ({
    userId: String(r.user_id),
    email: emails.get(String(r.user_id)) || '(unknown)',
    status: String(r.status),
    connectedAt: (r.connected_at as string | null) ?? null,
    lastSyncAt: (r.last_sync_at as string | null) ?? null,
  }));
}

/** Admin roll-up of connection + sync state (all real rows). */
export async function connectionStats(): Promise<{ byStatus: Record<string, number>; lastSyncAt: string | null; syncJobs30d: number }> {
  const sb = createAdminClient();
  if (!sb) return { byStatus: {}, lastSyncAt: null, syncJobs30d: 0 };
  const { data: conns } = await sb.from('user_wearable_connections').select('status');
  const byStatus: Record<string, number> = {};
  for (const c of (conns ?? []) as Record<string, unknown>[]) {
    const s = String(c.status);
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { count } = await sb.from('wearable_sync_jobs').select('id', { count: 'exact', head: true }).gte('created_at', since);
  const { data: last } = await sb.from('wearable_sync_jobs').select('finished_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return { byStatus, lastSyncAt: (last?.finished_at as string | null) ?? null, syncJobs30d: count ?? 0 };
}
