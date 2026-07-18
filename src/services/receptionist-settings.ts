import 'server-only';

import {
  DEFAULT_RECEPTIONIST_SETTINGS,
  type ReceptionistSettings,
} from '@/config/receptionist';
import { ok, type Result } from './result';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Admin-editable Receptionist AI settings. PRODUCTION: persisted in
 * system_settings (key 'receptionist_settings') so edits survive restarts and
 * deploys and apply across instances. An in-process cache keeps reads cheap; the
 * bundled defaults remain the fallback when the database is unavailable (local
 * preview) or no row exists yet. The receptionist service and the public console
 * both read from here, so an admin edit changes the live flow with no code change.
 */

const ORG = '00000000-0000-0000-0000-000000000001';
const KEY = 'receptionist_settings';

let cache: ReceptionistSettings = structuredClone(DEFAULT_RECEPTIONIST_SETTINGS);
let loaded = false;

async function load(): Promise<ReceptionistSettings> {
  const sb = createAdminClient();
  if (!sb) return cache;
  try {
    const { data } = await sb.from('system_settings').select('value').eq('organisation_id', ORG).eq('key', KEY).maybeSingle();
    const value = data?.value as Partial<ReceptionistSettings> | null;
    if (value && typeof value === 'object') {
      // Merge over the defaults so newly-added fields always have a value.
      cache = { ...structuredClone(DEFAULT_RECEPTIONIST_SETTINGS), ...value };
    }
    loaded = true;
  } catch {
    // fall back to the current cache
  }
  return cache;
}

async function persist(next: ReceptionistSettings): Promise<void> {
  const sb = createAdminClient();
  if (!sb) return;
  try {
    const existing = await sb.from('system_settings').select('id').eq('organisation_id', ORG).eq('key', KEY).maybeSingle();
    if (existing.data?.id) {
      await sb.from('system_settings').update({ value: next, updated_at: new Date().toISOString() }).eq('id', existing.data.id);
    } else {
      await sb.from('system_settings').insert({
        organisation_id: ORG,
        key: KEY,
        value: next,
        description: 'Receptionist AI settings (greeting, questions, threshold, escalation, WhatsApp) — admin-editable.',
        is_public: false,
      });
    }
  } catch {
    // cache still holds the value for this instance; next update retries
  }
}

export const receptionistSettings = {
  async get(): Promise<Result<ReceptionistSettings>> {
    if (!loaded) await load();
    return ok(cache);
  },
  async update(patch: Partial<ReceptionistSettings>): Promise<Result<ReceptionistSettings>> {
    if (!loaded) await load();
    cache = { ...cache, ...patch };
    await persist(cache);
    return ok(cache);
  },
  async reset(): Promise<Result<ReceptionistSettings>> {
    cache = structuredClone(DEFAULT_RECEPTIONIST_SETTINGS);
    await persist(cache);
    loaded = true;
    return ok(cache);
  },
};

/** Synchronous read for callers that need the current in-instance values. */
export function currentReceptionistSettings(): ReceptionistSettings {
  return cache;
}
