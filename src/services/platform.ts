import 'server-only';

import type { AuditLog, Notification, SystemSetting } from '@/types/platform';
import { ok, type Page, type Result } from './result';
import type { ListQuery } from './index';

/**
 * Platform/ops services — notifications, system settings, and the audit log.
 * NOTE: the LIVE audit trail is written and read via
 * `repositories/audit-repo.ts` (real append-only inserts into audit_logs). The
 * recorder below is an unused legacy no-op kept for interface compatibility,
 * and the settings/notifications here are static seed values — not the
 * database rows.
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
  /** Legacy no-op — the real audit write path is repositories/audit-repo.ts (auditRepo.log). */
  async record(_entry: AuditEntry): Promise<void> {
    // Intentionally does nothing; call sites use auditRepo.log for the live trail.
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

// Static seed values shown on /admin/config — NOT the system_settings table rows.
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
