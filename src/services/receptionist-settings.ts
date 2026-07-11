import 'server-only';

import {
  DEFAULT_RECEPTIONIST_SETTINGS,
  type ReceptionistSettings,
} from '@/config/receptionist';
import { ok, type Result } from './result';

/**
 * Runtime store for the admin-editable Receptionist AI settings. Prototype uses
 * a mutable in-process object seeded from the defaults; production persists these
 * to the database. The receptionist service and the public console both read
 * from here, so an admin edit changes the live flow with no code change.
 */

let current: ReceptionistSettings = structuredClone(DEFAULT_RECEPTIONIST_SETTINGS);

export const receptionistSettings = {
  async get(): Promise<Result<ReceptionistSettings>> {
    return ok(current);
  },
  async update(patch: Partial<ReceptionistSettings>): Promise<Result<ReceptionistSettings>> {
    current = { ...current, ...patch };
    return ok(current);
  },
  async reset(): Promise<Result<ReceptionistSettings>> {
    current = structuredClone(DEFAULT_RECEPTIONIST_SETTINGS);
    return ok(current);
  },
};

/** Synchronous read for server components that just need the current values. */
export function currentReceptionistSettings(): ReceptionistSettings {
  return current;
}
