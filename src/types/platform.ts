/**
 * Platform / operations model — mirrors migration 0013. Notifications, audit +
 * activity logs, system settings, and feature flags with targeting.
 */

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface Notification {
  id: string;
  organisationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organisationId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  organisationId: string | null;
  userId: string | null;
  action: string;
  context: Record<string, unknown>;
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  organisationId: string | null;
  key: string;
  value: unknown;
  description: string;
  isPublic: boolean;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  organisationId: string | null;
  key: string;
  description: string;
  enabled: boolean;
  rollout: Record<string, unknown>;
  status: 'draft' | 'active' | 'archived' | 'deleted';
}

export interface FeatureFlagOverride {
  id: string;
  flagId: string;
  userId: string | null;
  role: string | null;
  enabled: boolean;
}
