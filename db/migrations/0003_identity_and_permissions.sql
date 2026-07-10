-- ============================================================================
-- 0003 · Identity & the permission model: profiles, permissions, grants
--
-- profiles extends Supabase auth.users with application identity + the user's
-- effective role. The permission catalogue models fine-grained capabilities
-- (resource.action) that roles are granted, with per-user overrides — so the
-- client can tune access without code changes. The application ships the same
-- catalogue in code (src/config/permissions.ts) as the authoritative default;
-- these tables let production diverge per organisation.
-- ============================================================================

create type profile_status as enum ('invited', 'active', 'suspended', 'deactivated');

create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  organisation_id      uuid references public.organisations (id) on delete set null,
  role                 app_role not null default 'member',
  email                citext,
  full_name            text,
  display_name         text,
  avatar_url           text,           -- Supabase Storage path (see storage.md)
  phone                text,
  locale               text not null default 'en-GB',
  timezone             text not null default 'Europe/London',
  status               profile_status not null default 'active',
  onboarding_completed boolean not null default false,
  last_seen_at         timestamptz,
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on table public.profiles is
  'Application identity for each auth.users row. Holds the effective role and org.';
comment on column public.profiles.role is
  'The user''s effective role. Source of truth for app.current_role() used by RLS.';

create index on public.profiles (organisation_id, role);
create index on public.profiles (email);

-- ── Permission catalogue (resource.action) ──────────────────────────────────
create table public.permissions (
  key         text primary key,          -- e.g. 'knowledge.publish'
  resource    text not null,             -- e.g. 'knowledge'
  action      text not null,             -- e.g. 'publish'
  description text not null,
  -- Some permissions are dangerous and should require elevated confirmation.
  is_sensitive boolean not null default false,
  created_at  timestamptz not null default now()
);
comment on table public.permissions is
  'The catalogue of fine-grained capabilities. Mirrors src/config/permissions.ts.';

-- Default role → permission grants (the baseline matrix).
create table public.role_permissions (
  role            app_role not null,
  permission_key  text not null references public.permissions (key) on delete cascade,
  primary key (role, permission_key)
);
comment on table public.role_permissions is
  'Baseline permissions granted to each role. Additive; overrides refine per user.';

-- Per-user grant/deny overrides layered on top of role defaults.
create type permission_effect as enum ('grant', 'deny');
create table public.user_permission_overrides (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  permission_key  text not null references public.permissions (key) on delete cascade,
  effect          permission_effect not null,
  reason          text,
  granted_by      uuid references auth.users (id) on delete set null,
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, permission_key)
);
comment on table public.user_permission_overrides is
  'Explicit grant/deny per user. deny always wins over a role grant.';

create trigger set_updated_at before update on public.profiles
  for each row execute function app.set_updated_at();

-- ── has_permission helper ────────────────────────────────────────────────────
-- Effective decision = (role grants the permission OR user is explicitly granted)
--                       AND NOT explicitly denied (deny wins), with expiry respected.
create or replace function app.has_permission(perm_key text)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select
    -- explicit deny wins
    not exists (
      select 1 from public.user_permission_overrides o
      where o.user_id = auth.uid() and o.permission_key = perm_key
        and o.effect = 'deny' and (o.expires_at is null or o.expires_at > now())
    )
    and (
      -- granted by role
      exists (
        select 1 from public.role_permissions rp
        where rp.role = app.current_role() and rp.permission_key = perm_key
      )
      -- or explicitly granted to the user
      or exists (
        select 1 from public.user_permission_overrides o
        where o.user_id = auth.uid() and o.permission_key = perm_key
          and o.effect = 'grant' and (o.expires_at is null or o.expires_at > now())
      )
      -- super admins hold every permission implicitly
      or app.is_super_admin()
    );
$$;
comment on function app.has_permission is
  'Central permission check for RLS: role grant or user grant, minus any deny.';

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;

-- Profiles: a user reads/updates their own; staff read within org; admins manage.
create policy profile_self_read on public.profiles
  for select using (
    id = auth.uid()
    or (organisation_id = app.current_org_id() and app.is_staff())
    or app.is_super_admin()
  );
create policy profile_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = app.current_role());  -- users cannot escalate their own role
create policy profile_admin_write on public.profiles
  for all using (organisation_id = app.current_org_id() and app.is_admin())
  with check (organisation_id = app.current_org_id() and app.is_admin());

-- Permission catalogue + role grants: readable by staff, writable by admins only.
create policy permissions_read on public.permissions
  for select using (app.is_staff());
create policy permissions_admin on public.permissions
  for all using (app.is_admin()) with check (app.is_admin());
create policy role_perms_read on public.role_permissions
  for select using (app.is_staff());
create policy role_perms_admin on public.role_permissions
  for all using (app.is_admin()) with check (app.is_admin());

-- Overrides: a user sees their own; only admins may create them.
create policy overrides_self_read on public.user_permission_overrides
  for select using (user_id = auth.uid() or app.is_admin());
create policy overrides_admin_write on public.user_permission_overrides
  for all using (app.is_admin()) with check (app.is_admin());
