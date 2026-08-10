import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from '../records';
import { wearableConsent } from './store';
import { getWearableProvider } from './provider';
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
  const result = await provider.createConnection(userId);
  await wearableConsent.grant(userId, provider.key);
  await sb.from('user_wearable_connections').insert({
    organisation_id: ORG,
    user_id: userId,
    provider_key: provider.key,
    status: 'pending',
    external_connection_id: result.externalConnectionId,
  });
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
