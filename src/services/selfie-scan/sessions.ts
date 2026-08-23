import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { SelfieScanLaunch, SelfieScanWebhookEvent } from './provider';

const ORG = '00000000-0000-0000-0000-000000000001';

export interface SelfieScanSession {
  id: string;
  userId: string;
  provider: string | null;
  providerSessionId: string | null;
  status: string;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export const selfieScanSessions = {
  async create(userId: string, launch: SelfieScanLaunch): Promise<SelfieScanSession | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from('selfie_scan_sessions')
      .insert({
        organisation_id: ORG,
        user_id: userId,
        provider: launch.provider,
        provider_session_id: launch.providerSessionId,
        status: 'pending',
        provider_metadata: { ...(launch.metadata ?? {}), expiresAt: launch.expiresAt ?? null },
        started_at: new Date().toISOString(),
      })
      .select('id, user_id, provider, provider_session_id, status, failure_code, created_at, updated_at')
      .single();
    if (error || !data) return null;
    return {
      id: String(data.id),
      userId: String(data.user_id),
      provider: (data.provider as string | null) ?? null,
      providerSessionId: (data.provider_session_id as string | null) ?? null,
      status: String(data.status),
      failureCode: (data.failure_code as string | null) ?? null,
      createdAt: String(data.created_at),
      updatedAt: String(data.updated_at),
    };
  },

  async latestForUser(userId: string): Promise<SelfieScanSession | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data } = await sb
      .from('selfie_scan_sessions')
      .select('id, user_id, provider, provider_session_id, status, failure_code, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: String(data.id),
      userId: String(data.user_id),
      provider: (data.provider as string | null) ?? null,
      providerSessionId: (data.provider_session_id as string | null) ?? null,
      status: String(data.status),
      failureCode: (data.failure_code as string | null) ?? null,
      createdAt: String(data.created_at),
      updatedAt: String(data.updated_at),
    };
  },

  async applyWebhook(provider: string, event: SelfieScanWebhookEvent): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const terminal = event.status === 'completed' || event.status === 'failed' || event.status === 'cancelled';
    const { data, error } = await sb
      .from('selfie_scan_sessions')
      .update({
        status: event.status,
        result_summary: event.resultSummary ?? {},
        failure_code: event.failureCode ?? null,
        provider_metadata: event.metadata ?? {},
        ...(terminal ? { completed_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('provider', provider)
      .eq('provider_session_id', event.providerSessionId)
      .select('id')
      .maybeSingle();
    return !error && Boolean(data);
  },
};
