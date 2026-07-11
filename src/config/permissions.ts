import type { AppRole } from '@/lib/auth/roles';

/**
 * The permission catalogue — the authoritative list of fine-grained capabilities
 * and which roles hold them. Mirrors db tables `permissions` / `role_permissions`
 * (migration 0003); in production those tables are seeded FROM this file, and
 * per-user overrides refine it. RLS enforces the same rules at the data layer.
 *
 * Design decisions:
 *  • Keys are `resource.action` (+ optional scope) so they read like sentences.
 *  • Members hold NO catalogue permissions — access to their own data is granted
 *    by ownership (RLS `user_id = auth.uid()`), not by a permission. The
 *    catalogue governs privileged, cross-user, and operational actions.
 *  • The role hierarchy is linear and CUMULATIVE: each role inherits every
 *    permission of the roles below it and adds its own. super_administrator holds
 *    every permission implicitly (a wildcard), so new permissions are auto-granted.
 */

export interface PermissionMeta {
  resource: string;
  action: string;
  description: string;
  /** Dangerous actions that should require elevated confirmation / MFA in prod. */
  sensitive?: boolean;
}

export const PERMISSIONS = {
  // ── Users & access control ────────────────────────────────────────────────
  'users.read': { resource: 'users', action: 'read', description: 'View other users in the organisation.' },
  'users.create': { resource: 'users', action: 'create', description: 'Invite or create users.' },
  'users.update': { resource: 'users', action: 'update', description: 'Edit user profiles and status.' },
  'users.delete': { resource: 'users', action: 'delete', description: 'Deactivate or delete users.', sensitive: true },
  'users.impersonate': { resource: 'users', action: 'impersonate', description: 'Sign in as another user for support.', sensitive: true },
  'roles.read': { resource: 'roles', action: 'read', description: 'View roles and assignments.' },
  'roles.assign': { resource: 'roles', action: 'assign', description: 'Change a user’s role.', sensitive: true },
  'permissions.manage': { resource: 'permissions', action: 'manage', description: 'Edit the permission matrix and overrides.', sensitive: true },

  // ── Care / clinical ───────────────────────────────────────────────────────
  'members.read': { resource: 'members', action: 'read', description: 'View member records within care scope.' },
  'health.read': { resource: 'health', action: 'read', description: 'Read a member’s health profile and history.', sensitive: true },
  'health.update': { resource: 'health', action: 'update', description: 'Update a member’s health records.', sensitive: true },
  'assessments.read': { resource: 'assessments', action: 'read', description: 'View member assessments (Assessment, scans, intake).' },
  'assessments.review': { resource: 'assessments', action: 'review', description: 'Clinically review and sign off assessments.' },
  'consultations.read': { resource: 'consultations', action: 'read', description: 'View consultations.' },
  'consultations.manage': { resource: 'consultations', action: 'manage', description: 'Conduct and record consultations.' },
  'appointments.read': { resource: 'appointments', action: 'read', description: 'View the appointment calendar.' },
  'appointments.manage': { resource: 'appointments', action: 'manage', description: 'Create, reschedule and cancel appointments.' },

  // ── Content: programmes & knowledge ───────────────────────────────────────
  'programmes.read': { resource: 'programmes', action: 'read', description: 'View all programmes (incl. unpublished).' },
  'programmes.manage': { resource: 'programmes', action: 'manage', description: 'Create and edit programmes.' },
  'programmes.publish': { resource: 'programmes', action: 'publish', description: 'Publish or unpublish programmes.' },
  'knowledge.read': { resource: 'knowledge', action: 'read', description: 'View knowledge documents (incl. drafts).' },
  'knowledge.create': { resource: 'knowledge', action: 'create', description: 'Add knowledge documents.' },
  'knowledge.edit': { resource: 'knowledge', action: 'edit', description: 'Edit knowledge documents and versions.' },
  'knowledge.approve': { resource: 'knowledge', action: 'approve', description: 'Approve documents in the review workflow.' },
  'knowledge.publish': { resource: 'knowledge', action: 'publish', description: 'Publish approved documents.' },
  'knowledge.delete': { resource: 'knowledge', action: 'delete', description: 'Delete knowledge documents.', sensitive: true },

  // ── AI framework ──────────────────────────────────────────────────────────
  'agents.read': { resource: 'agents', action: 'read', description: 'View AI agents and their configuration.' },
  'agents.create': { resource: 'agents', action: 'create', description: 'Create new AI agents.' },
  'agents.update': { resource: 'agents', action: 'update', description: 'Edit agent prompts and settings.' },
  'agents.delete': { resource: 'agents', action: 'delete', description: 'Archive or delete AI agents.', sensitive: true },
  'agents.configure': { resource: 'agents', action: 'configure', description: 'Manage tools, models and safety rules.', sensitive: true },
  'ai.config.manage': { resource: 'ai', action: 'config.manage', description: 'Manage global AI configuration.', sensitive: true },
  'conversations.read.all': { resource: 'conversations', action: 'read.all', description: 'Read any conversation for support/moderation.', sensitive: true },
  'memory.read': { resource: 'memory', action: 'read', description: 'Read organisation/agent memory.' },
  'memory.manage': { resource: 'memory', action: 'manage', description: 'Edit or clear memory scopes.', sensitive: true },

  // ── Commerce ──────────────────────────────────────────────────────────────
  'subscriptions.read': { resource: 'subscriptions', action: 'read', description: 'View subscriptions.' },
  'payments.read': { resource: 'payments', action: 'read', description: 'View payments and invoices.', sensitive: true },
  'payments.refund': { resource: 'payments', action: 'refund', description: 'Issue refunds.', sensitive: true },

  // ── Platform / operations ─────────────────────────────────────────────────
  'clinics.manage': { resource: 'clinics', action: 'manage', description: 'Manage clinics/locations.' },
  'notifications.send': { resource: 'notifications', action: 'send', description: 'Send notifications to members.' },
  'analytics.read': { resource: 'analytics', action: 'read', description: 'View analytics dashboards.' },
  'activity.read': { resource: 'activity', action: 'read', description: 'View activity logs.' },
  'settings.read': { resource: 'settings', action: 'read', description: 'View system settings.' },
  'settings.manage': { resource: 'settings', action: 'manage', description: 'Change system settings.', sensitive: true },
  'feature_flags.read': { resource: 'feature_flags', action: 'read', description: 'View feature flags.' },
  'feature_flags.manage': { resource: 'feature_flags', action: 'manage', description: 'Toggle and target feature flags.' },
  'audit.read': { resource: 'audit', action: 'read', description: 'Read audit logs.', sensitive: true },
  'organisations.manage': { resource: 'organisations', action: 'manage', description: 'Manage organisations (platform).', sensitive: true },
} as const satisfies Record<string, PermissionMeta>;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

/**
 * Incremental permissions each role ADDS on top of the roles below it.
 * The effective set is computed cumulatively in src/lib/auth/permissions.ts.
 * super_administrator is intentionally omitted here — it holds every permission.
 */
export const ROLE_BASE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  guest: [],
  member: [],
  practitioner: [
    'members.read',
    'health.read',
    'health.update',
    'assessments.read',
    'assessments.review',
    'consultations.read',
    'consultations.manage',
    'appointments.read',
    'knowledge.read',
    'agents.read',
  ],
  staff: [
    'users.read',
    'appointments.manage',
    'programmes.read',
    'programmes.manage',
    'knowledge.create',
    'knowledge.edit',
    'subscriptions.read',
    'clinics.manage',
    'notifications.send',
    'analytics.read',
    'activity.read',
    'settings.read',
    'feature_flags.read',
    'memory.read',
  ],
  administrator: [
    'users.create',
    'users.update',
    'users.delete',
    'roles.read',
    'roles.assign',
    'programmes.publish',
    'knowledge.approve',
    'knowledge.publish',
    'knowledge.delete',
    'agents.create',
    'agents.update',
    'agents.delete',
    'agents.configure',
    'ai.config.manage',
    'conversations.read.all',
    'memory.manage',
    'payments.read',
    'payments.refund',
    'settings.manage',
    'feature_flags.manage',
    'audit.read',
  ],
  super_administrator: [
    'users.impersonate',
    'permissions.manage',
    'organisations.manage',
  ],
};
