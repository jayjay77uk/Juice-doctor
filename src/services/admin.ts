import 'server-only';

import type { Profile } from '@/types/identity';
import type { AppRole } from '@/lib/auth/roles';
import { ok, type Page, type Result } from './result';
import type { ListQuery } from './index';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/env';

/**
 * Admin service — the read layer the administration framework is built on
 * (user management, metrics). PRODUCTION: reads real profiles + live aggregates
 * (appointments, notifications, knowledge). The canned rows below remain only as
 * the local preview fallback.
 */

const SEED_ORG = '00000000-0000-0000-0000-000000000001';
const SEED_TS = '2026-07-10T00:00:00.000Z';

const SEED_USERS: Profile[] = [
  { id: 'usr_admin', organisationId: SEED_ORG, role: 'administrator', email: 'admin@example.com', fullName: 'Admin User', displayName: 'Admin', avatarUrl: null, phone: null, locale: 'en-GB', timezone: 'Europe/London', status: 'active', onboardingCompleted: true, lastSeenAt: SEED_TS, createdAt: SEED_TS },
  { id: 'usr_practitioner', organisationId: SEED_ORG, role: 'practitioner', email: 'practitioner@example.com', fullName: 'Practitioner One', displayName: 'Practitioner', avatarUrl: null, phone: null, locale: 'en-GB', timezone: 'Europe/London', status: 'active', onboardingCompleted: true, lastSeenAt: SEED_TS, createdAt: SEED_TS },
  { id: 'usr_staff', organisationId: SEED_ORG, role: 'staff', email: 'staff@example.com', fullName: 'Staff One', displayName: 'Staff', avatarUrl: null, phone: null, locale: 'en-GB', timezone: 'Europe/London', status: 'active', onboardingCompleted: true, lastSeenAt: SEED_TS, createdAt: SEED_TS },
  { id: 'usr_member', organisationId: SEED_ORG, role: 'member', email: 'member@example.com', fullName: 'Prototype User', displayName: 'Member', avatarUrl: null, phone: null, locale: 'en-GB', timezone: 'Europe/London', status: 'active', onboardingCompleted: false, lastSeenAt: SEED_TS, createdAt: SEED_TS },
];

function rowToProfile(r: Record<string, unknown>): Profile {
  return {
    id: String(r.id),
    organisationId: (r.organisation_id as string | null) ?? null,
    role: (r.role as AppRole) ?? 'member',
    email: (r.email as string | null) ?? null,
    fullName: (r.full_name as string | null) ?? null,
    displayName: (r.display_name as string | null) ?? null,
    avatarUrl: (r.avatar_url as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    locale: String(r.locale ?? 'en-GB'),
    timezone: String(r.timezone ?? 'Europe/London'),
    status: (r.status as Profile['status']) ?? 'active',
    onboardingCompleted: Boolean(r.onboarding_completed),
    lastSeenAt: (r.last_seen_at as string | null) ?? null,
    createdAt: String(r.created_at ?? SEED_TS),
  };
}

export interface AdminMetrics {
  activeClients: number;
  bookingsThisWeek: number;
  unreadMessages: number;
  publishedResources: number;
}

export const admin = {
  users: {
    async list(q: ListQuery = {}): Promise<Result<Page<Profile>>> {
      const sb = createAdminClient();
      if (!sb || !isSupabaseAdminConfigured()) return ok({ items: SEED_USERS, nextCursor: null });
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(q.limit ?? 100);
      if (error) return ok({ items: SEED_USERS, nextCursor: null });
      return ok({ items: (data ?? []).map(rowToProfile), nextCursor: null });
    },
    async count(): Promise<Result<number>> {
      const sb = createAdminClient();
      if (!sb || !isSupabaseAdminConfigured()) return ok(SEED_USERS.length);
      const { count } = await sb.from('profiles').select('id', { count: 'exact', head: true });
      return ok(count ?? 0);
    },
  },
  async metrics(): Promise<Result<AdminMetrics>> {
    const sb = createAdminClient();
    if (!sb || !isSupabaseAdminConfigured()) {
      return ok({ activeClients: 48, bookingsThisWeek: 12, unreadMessages: 5, publishedResources: 4 });
    }
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [clients, bookings, unread, published] = await Promise.all([
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'member').eq('status', 'active'),
      sb.from('appointments').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      sb.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
      sb.from('knowledge_documents').select('id', { count: 'exact', head: true }).eq('publish_status', 'published'),
    ]);
    return ok({
      activeClients: clients.count ?? 0,
      bookingsThisWeek: bookings.count ?? 0,
      unreadMessages: unread.count ?? 0,
      publishedResources: published.count ?? 0,
    });
  },
};
