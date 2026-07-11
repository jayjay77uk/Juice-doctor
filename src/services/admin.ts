import 'server-only';

import type { Profile } from '@/types/identity';
import { ok, type Page, type Result } from './result';
import type { ListQuery } from './index';

/**
 * Admin service — the read layer the administration framework is built on
 * (user management, metrics). Architecture only: no destructive business logic.
 * Prototype returns canned data; production reads profiles + aggregates behind
 * RBAC (users.read) and RLS.
 */

const SEED_ORG = '00000000-0000-0000-0000-000000000001';
const SEED_TS = '2026-07-10T00:00:00.000Z';

const SEED_USERS: Profile[] = [
  { id: 'usr_admin', organisationId: SEED_ORG, role: 'administrator', email: 'admin@example.com', fullName: 'Admin User', displayName: 'Admin', avatarUrl: null, phone: null, locale: 'en-GB', timezone: 'Europe/London', status: 'active', onboardingCompleted: true, lastSeenAt: SEED_TS, createdAt: SEED_TS },
  { id: 'usr_practitioner', organisationId: SEED_ORG, role: 'practitioner', email: 'practitioner@example.com', fullName: 'Practitioner One', displayName: 'Practitioner', avatarUrl: null, phone: null, locale: 'en-GB', timezone: 'Europe/London', status: 'active', onboardingCompleted: true, lastSeenAt: SEED_TS, createdAt: SEED_TS },
  { id: 'usr_staff', organisationId: SEED_ORG, role: 'staff', email: 'staff@example.com', fullName: 'Staff One', displayName: 'Staff', avatarUrl: null, phone: null, locale: 'en-GB', timezone: 'Europe/London', status: 'active', onboardingCompleted: true, lastSeenAt: SEED_TS, createdAt: SEED_TS },
  { id: 'usr_member', organisationId: SEED_ORG, role: 'member', email: 'member@example.com', fullName: 'Prototype User', displayName: 'Member', avatarUrl: null, phone: null, locale: 'en-GB', timezone: 'Europe/London', status: 'active', onboardingCompleted: false, lastSeenAt: SEED_TS, createdAt: SEED_TS },
];

export interface AdminMetrics {
  activeClients: number;
  bookingsThisWeek: number;
  unreadMessages: number;
  publishedResources: number;
}

export const admin = {
  users: {
    async list(_q: ListQuery = {}): Promise<Result<Page<Profile>>> {
      return ok({ items: SEED_USERS, nextCursor: null });
    },
    async count(): Promise<Result<number>> {
      return ok(SEED_USERS.length);
    },
  },
  async metrics(): Promise<Result<AdminMetrics>> {
    // Prototype: illustrative figures. Production: real aggregates.
    return ok({ activeClients: 48, bookingsThisWeek: 12, unreadMessages: 5, publishedResources: 4 });
  },
};
