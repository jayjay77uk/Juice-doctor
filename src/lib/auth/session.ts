import 'server-only';

import { cache } from 'react';
import type { AppRole } from './roles';
import type { AuthContext } from './permissions';
import type { PermissionKey } from '@/config/permissions';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The session seam — production-shaped from day one.
 *
 * `getSession()` is async + server-only. In the PROTOTYPE it resolves a canned
 * session (optionally hinted to a role so the member/admin shells can each show
 * their own persona). In PRODUCTION it reads the Supabase auth cookie
 * server-side, awaits token refresh, loads the profile (role + org + overrides),
 * and RLS enforces access independently. Only the body of `loadSession()` changes.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  organisationId: string | null;
  /** Per-user permission overrides layered on the role defaults. */
  grants?: PermissionKey[];
  denies?: PermissionKey[];
}

export interface Session {
  user: SessionUser;
}

// ── Prototype canned personas ────────────────────────────────────────────────
const PROTOTYPE_ORG_ID = '00000000-0000-0000-0000-000000000001';

const CANNED: Record<AppRole, SessionUser> = {
  guest: { id: 'guest', name: 'Guest', email: '', role: 'guest', organisationId: null },
  member: {
    id: 'usr_member',
    name: 'Prototype User',
    email: 'hello@example.com',
    role: 'member',
    organisationId: PROTOTYPE_ORG_ID,
  },
  practitioner: {
    id: 'usr_practitioner',
    name: 'Practitioner One',
    email: 'practitioner@example.com',
    role: 'practitioner',
    organisationId: PROTOTYPE_ORG_ID,
  },
  staff: {
    id: 'usr_staff',
    name: 'Staff One',
    email: 'staff@example.com',
    role: 'staff',
    organisationId: PROTOTYPE_ORG_ID,
  },
  administrator: {
    id: 'usr_admin',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'administrator',
    organisationId: PROTOTYPE_ORG_ID,
  },
  super_administrator: {
    id: 'usr_super',
    name: 'Platform Owner',
    email: 'owner@example.com',
    role: 'super_administrator',
    organisationId: null,
  },
};

/**
 * The single place that knows how a session is obtained. Swap this body for the
 * Supabase implementation in Phase 2 — the rest of the app depends only on the
 * shape returned here.
 */
async function loadSession(roleHint: AppRole): Promise<Session | null> {
  // Local dev without Supabase keys: fall back to the canned persona so the app
  // still renders. On the deployed platform (Supabase configured) this branch is
  // never taken — a real, verified session is loaded below.
  if (!isSupabaseConfigured()) {
    return { user: CANNED[roleHint] };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { user: CANNED[roleHint] };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Load the role/profile via the service-role client (trusted server lookup).
  let role: AppRole = 'member';
  let organisationId: string | null = null;
  let name = user.email ?? 'User';
  let email = user.email ?? '';
  const admin = createAdminClient();
  if (admin) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role, organisation_id, email, full_name, display_name')
      .eq('id', user.id)
      .maybeSingle();
    if (profile) {
      role = (profile.role as AppRole | null) ?? 'member';
      organisationId = (profile.organisation_id as string | null) ?? null;
      name = (profile.display_name as string | null) ?? (profile.full_name as string | null) ?? name;
      email = (profile.email as string | null) ?? email;
    }
  }

  return { user: { id: user.id, name, email, role, organisationId } };
}

/**
 * The current session, memoised per request. `roleHint` is a PROTOTYPE-ONLY
 * affordance so different shells can present different personas; production
 * ignores it entirely (the role comes from the authenticated profile).
 */
export const getSession = cache(async (roleHint: AppRole = 'member'): Promise<Session | null> => {
  return loadSession(roleHint);
});

/** Convert a session into the RBAC AuthContext used by permission checks. */
export function toAuthContext(session: Session | null): AuthContext {
  if (!session) return { role: 'guest' };
  const { role, grants, denies } = session.user;
  return {
    role,
    ...(grants ? { grants } : {}),
    ...(denies ? { denies } : {}),
  };
}
