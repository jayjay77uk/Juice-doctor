import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Read model over the REAL system_settings table (org-scoped key/value rows —
 * e.g. receptionist settings, the HERNE shared DNA). Values are jsonb; the
 * admin Configuration Centre shows a truncated preview, never a fabricated
 * value. Writes stay with the owning services (receptionist-settings, herne).
 */

export interface SystemSettingRow {
  key: string;
  preview: string;
  isPublic: boolean;
  updatedAt: string;
}

function previewOf(value: unknown): string {
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  } catch {
    return '(unrenderable value)';
  }
}

export const systemSettings = {
  /** Raw value of one setting, or null when unset/unavailable. Server-only. */
  async getValue(key: string): Promise<unknown> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data, error } = await sb.from('system_settings').select('value').eq('key', key).maybeSingle();
    if (error || !data) return null;
    return data.value;
  },

  /** Upsert one setting (server-side, caller must have authorised). */
  async setValue(key: string, value: unknown, opts?: { isPublic?: boolean }): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    // The unique index is (organisation_id, key) NULLS NOT DISTINCT — naming
    // 'key' alone makes every upsert fail with a missing-constraint error.
    const { error } = await sb
      .from('system_settings')
      .upsert(
        { organisation_id: null, key, value, is_public: opts?.isPublic ?? false, updated_at: new Date().toISOString() },
        { onConflict: 'organisation_id,key' },
      );
    return !error;
  },

  async all(): Promise<SystemSettingRow[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from('system_settings')
      .select('key, value, is_public, updated_at')
      .order('key');
    if (error) return [];
    return (data ?? []).map((r: Record<string, unknown>) => ({
      key: String(r.key),
      preview: previewOf(r.value),
      isPublic: Boolean(r.is_public),
      updatedAt: String(r.updated_at ?? ''),
    }));
  },
};
