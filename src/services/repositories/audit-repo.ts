import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Audit-log repository over audit_logs (migration 0013). Every privileged admin
 * mutation records who did what to which entity. Best-effort by design: an audit
 * write must never block or fail the underlying action, but success paths always
 * attempt one.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

export interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export const auditRepo = {
  /** Record an admin/system action. Never throws. */
  async log(input: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  }): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    try {
      await sb.from('audit_logs').insert({
        organisation_id: ORG,
        actor_id: input.actorId ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        before: input.before ?? null,
        after: input.after ?? null,
      });
    } catch {
      // best-effort
    }
  },

  /** Recent audit entries, newest first (admin read). */
  async recent(limit = 50): Promise<AuditEntry[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb
      .from('audit_logs')
      .select('id, actor_id, action, entity_type, entity_id, after, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      id: String(r.id),
      actorId: (r.actor_id as string | null) ?? null,
      action: String(r.action),
      entityType: String(r.entity_type),
      entityId: (r.entity_id as string | null) ?? null,
      after: (r.after as Record<string, unknown> | null) ?? null,
      createdAt: String(r.created_at),
    }));
  },
};
