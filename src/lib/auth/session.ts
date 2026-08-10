import 'server-only';

import { cache } from 'react';
import type { AppRole } from './roles';
import type { AuthContext } from './permissions';
import type { PermissionKey } from '@/config/permissions';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The session seam.
 *
 * `getSession()` is async + server-only. With Supabase configured (the deployed
 * platform) it reads the Supabase auth cookie server-side, awaits token refresh,
 * loads the profile (role + org + overrides), and RLS enforces access
 * independently. Without Supabase configured, or without a signed-in user,
 * there is no session — callers render their honest unauthenticated or
 * unavailable states.
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

/**
 * The single place that knows how a session is obtained — the rest of the app
 * depends only on the shape returned here. There is NO fictional fallback:
 * without Supabase (or without a signed-in user) there is no session, and the
 * caller renders its honest unauthenticated/unavailable state.
 */
async function loadSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let role: AppRole = 'member';
  let organisationId: string | null = null;
  let name = user.email ?? 'User';
  let email = user.email ?? '';

  // Resolve the caller's OWN profile. Prefer the RLS-scoped user client — the
  // `profile_self_read` policy (id = auth.uid()) lets a user read their own row —
  // so a user's role does NOT depend on the service-role key being present. Fall
  // back to the admin client only if the self-read fails. This prevents a missing
  // SUPABASE_SERVICE_ROLE_KEY from silently demoting an administrator to 'member'
  // (which would then be denied at the /admin gate).
  const cols = 'role, organisation_id, email, full_name, display_name';
  let profile: Record<string, unknown> | null = null;
  const selfRead = await supabase.from('profiles').select(cols).eq('id', user.id).maybeSingle();
  if (!selfRead.error && selfRead.data) {
    profile = selfRead.data as Record<string, unknown>;
  } else {
    const admin = createAdminClient();
    if (admin) {
      const adminRead = await admin.from('profiles').select(cols).eq('id', user.id).maybeSingle();
      if (adminRead.data) profile = adminRead.data as Record<string, unknown>;
    }
  }

  if (profile) {
    role = (profile.role as AppRole | null) ?? 'member';
    organisationId = (profile.organisation_id as string | null) ?? null;
    name = (profile.display_name as string | null) ?? (profile.full_name as string | null) ?? name;
    email = (profile.email as string | null) ?? email;
  } else {
    // No profile row for an authenticated user is an anomaly — surface it in the
    // server logs rather than silently treating a possible admin as a member.
    console.warn(`[auth] no profiles row for user ${user.id}; defaulting role to 'member'`);
  }

  return { user: { id: user.id, name, email, role, organisationId } };
}

/**
 * The current session, memoised per request. The role always comes from the
 * authenticated profile; there is no persona fallback. (A legacy role-hint
 * argument is accepted and ignored for call-site compatibility.)
 */
export const getSession = cache(async (_roleHint?: AppRole): Promise<Session | null> => {
  return loadSession();
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
