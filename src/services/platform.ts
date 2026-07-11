import 'server-only';

import type { AuditLog, Notification, SystemSetting } from '@/types/platform';
import { ok, type Page, type Result } from './result';
import type { ListQuery } from './index';

/**
 * Platform/ops services — notifications, system settings, and the audit log.
 * The audit recorder is the one call sites use to write the append-only trail;
 * in the prototype it is a no-op (nothing is stored), in production it inserts
 * into audit_logs via SECURITY DEFINER server code.
 */

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  organisationId?: string | null;
}

export const audit = {
  /** Record an auditable action. Prototype: no-op. Production: insert append-only. */
  async record(_entry: AuditEntry): Promise<void> {
    // no-op in the prototype — nothing is stored.
  },
  async list(_q: ListQuery = {}): Promise<Result<Page<AuditLog>>> {
    return ok({ items: [], nextCursor: null });
  },
};

export const notifications = {
  async listForUser(_userId: string, _q: ListQuery = {}): Promise<Result<Page<Notification>>> {
    return ok({ items: [], nextCursor: null });
  },
  async unreadCount(_userId: string): Promise<Result<number>> {
    return ok(0);
  },
};

const SEED_SETTINGS: SystemSetting[] = [
  {
    id: 'set_brand',
    organisationId: null,
    key: 'brand.name',
    value: 'Prototype AI',
    description: 'Public brand name.',
    isPublic: true,
    updatedAt: '2026-07-10T00:00:00.000Z',
  },
  {
    id: 'set_support_email',
    organisationId: null,
    key: 'support.email',
    value: 'hello@example.com',
    description: 'Support contact address.',
    isPublic: true,
    updatedAt: '2026-07-10T00:00:00.000Z',
  },
];

export const settings = {
  async all(): Promise<Result<SystemSetting[]>> {
    return ok(SEED_SETTINGS);
  },
  async get(key: string): Promise<Result<SystemSetting | null>> {
    return ok(SEED_SETTINGS.find((s) => s.key === key) ?? null);
  },
};
