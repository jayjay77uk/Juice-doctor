-- ============================================================================
-- 0013 · Platform / Ops: notifications, audit & activity logs, settings, flags
--
-- The cross-cutting operational backbone every other domain leans on. Modelling
-- decisions, and WHY:
--
--  * NOTIFICATIONS are per-recipient (user_id) but also carry organisation_id so
--    admins can observe/operate their tenant's notification volume without ever
--    reading another tenant's data. `data jsonb` keeps the payload open-ended
--    (deep-link ids, template vars) without a migration per notification type.
--
--  * AUDIT_LOGS are a tamper-evident, APPEND-ONLY forensic record — the "who
--    changed what, from what, to what, from where" trail a health platform needs
--    for compliance. before/after are jsonb snapshots so any entity can be
--    audited generically (entity_type + entity_id are free text, not FKs, so a
--    log survives deletion of the thing it describes). organisation_id/actor_id
--    are nullable because platform-level and system/cron actions have no tenant
--    or human actor. NO update/delete policies exist anywhere — history is
--    immutable; only admins/super-admins may read.
--
--  * ACTIVITY_LOGS are a lighter, product-analytics stream ("user viewed X",
--    "ran a scan") — also append-only, but a user may read their OWN activity
--    (transparency / data-subject access), while staff/admin read within org.
--
--  * SYSTEM_SETTINGS + FEATURE_FLAGS both use a nullable organisation_id where
--    NULL == platform-global and a non-null value == a tenant override, with a
--    UNIQUE(organisation_id, key). A NULLS-NOT-DISTINCT unique index is used so
--    two global rows can't share a key (Postgres treats NULLs as distinct by
--    default, which would allow duplicate globals). Public settings are world-
--    readable so the client can bootstrap before auth; everything else is admin.
--
--  * FEATURE_FLAG_OVERRIDES express targeting: a flag can be forced on/off for a
--    specific user OR a whole role, layered on top of the flag's base `enabled`
--    and `rollout` (percentage / attribute rules). Evaluated app-side; the DB
--    just stores the rules. Flags + overrides are readable by staff so gated UI
--    renders correctly, and writable only by admins.
--
-- References migrations 0001 (app.* helpers, set_updated_at, enums) through
-- 0005. Does NOT recreate organisations/clinics/profiles/auth.users.
-- ============================================================================

-- ── Enums (namespaced by domain: notification_*) ─────────────────────────────

-- Delivery channel for a notification. `in_app` is the always-on default; the
-- others are best-effort and gated by the recipient's user_preferences.
create type notification_channel as enum ('in_app', 'email', 'sms', 'push');


-- ── notifications ────────────────────────────────────────────────────────────
-- Per-recipient message. Not append-only: the recipient flips read_at, and rows
-- are prunable by retention jobs. organisation_id gives admins tenant-scoped
-- visibility without crossing tenant boundaries.
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- The recipient. Cascade so a deleted user's notifications go with them.
  user_id         uuid not null references auth.users (id) on delete cascade,
  type            text not null,                              -- e.g. 'appointment.reminder'
  title           text not null,
  body            text,
  channel         notification_channel not null default 'in_app',
  -- Free-form payload: deep-link ids, template variables, cta urls, etc.
  data            jsonb not null default '{}'::jsonb,
  -- NULL = unread. Set to now() when the recipient reads it.
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
comment on table public.notifications is
  'Per-recipient notifications across in-app/email/sms/push channels; NULL read_at = unread.';

-- Drives the notification bell: this user's rows, unread first / newest first.
create index notifications_user_read_created_idx
  on public.notifications (user_id, read_at, created_at desc);
-- Admin tenant-wide views ordered by recency.
create index notifications_org_created_idx
  on public.notifications (organisation_id, created_at desc);


-- ── audit_logs ───────────────────────────────────────────────────────────────
-- APPEND-ONLY forensic trail. Immutable by policy: no update/delete policies are
-- ever defined, so even a compromised admin session cannot rewrite history.
-- entity_type/entity_id are free text so a log outlives the entity it describes.
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  -- NULL for platform-level actions with no tenant context.
  organisation_id uuid references public.organisations (id) on delete set null,
  -- NULL for system / cron / unauthenticated actions.
  actor_id        uuid references auth.users (id) on delete set null,
  action          text not null,                              -- e.g. 'profile.updated'
  entity_type     text not null,                              -- e.g. 'profiles'
  entity_id       text,                                       -- free text (may be uuid or composite)
  before          jsonb,                                      -- snapshot pre-change
  after           jsonb,                                      -- snapshot post-change
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);
comment on table public.audit_logs is
  'Append-only, immutable forensic audit trail (who/what/before/after/where). Admin read-only.';

create index audit_logs_org_created_idx
  on public.audit_logs (organisation_id, created_at desc);
-- Reconstruct the full history of one entity.
create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);


-- ── activity_logs ────────────────────────────────────────────────────────────
-- APPEND-ONLY product/analytics stream. Lighter than audit_logs (no before/after
-- diffs); a user may read their own, staff/admin read within org.
create table public.activity_logs (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete set null,
  -- NULL for anonymous / pre-auth events.
  user_id         uuid references auth.users (id) on delete set null,
  action          text not null,                              -- e.g. 'scan.completed'
  context         jsonb not null default '{}'::jsonb,         -- arbitrary event metadata
  ip_address      inet,
  created_at      timestamptz not null default now()
);
comment on table public.activity_logs is
  'Append-only activity/analytics stream. Users read own; staff/admin read within org.';

-- A user's own timeline, newest first.
create index activity_logs_user_created_idx
  on public.activity_logs (user_id, created_at desc);
-- Tenant-wide staff/admin views.
create index activity_logs_org_created_idx
  on public.activity_logs (organisation_id, created_at desc);


-- ── system_settings ──────────────────────────────────────────────────────────
-- Key/value config. organisation_id NULL == platform-global; non-null == tenant
-- override of that key. is_public rows are world-readable so unauthenticated
-- clients can bootstrap (branding, public toggles).
create table public.system_settings (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete cascade,
  key             text not null,
  value           jsonb not null default '{}'::jsonb,
  description     text,
  is_public       boolean not null default false,
  updated_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.system_settings is
  'Key/value config; organisation_id NULL = platform-global, else tenant override. is_public = world-readable.';

-- One value per (tenant, key). NULLS NOT DISTINCT so two global rows can't share
-- a key (default NULL-distinct behaviour would permit duplicate globals).
create unique index system_settings_org_key_uk
  on public.system_settings (organisation_id, key) nulls not distinct;


-- ── feature_flags ────────────────────────────────────────────────────────────
-- Base flag definition. organisation_id NULL == platform-global; non-null ==
-- tenant-specific flag. `rollout` holds percentage / attribute targeting rules
-- evaluated app-side; overrides (below) pin specific users/roles.
create table public.feature_flags (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete cascade,
  key             text not null,
  description     text,
  enabled         boolean not null default false,            -- base state
  rollout         jsonb not null default '{}'::jsonb,        -- e.g. {"percentage": 25}
  status          record_status not null default 'active',
  updated_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.feature_flags is
  'Feature flag definitions; organisation_id NULL = platform-global, else tenant flag.';

-- One flag per (tenant, key); NULLS NOT DISTINCT to keep globals unique.
create unique index feature_flags_org_key_uk
  on public.feature_flags (organisation_id, key) nulls not distinct;
create index feature_flags_status_idx
  on public.feature_flags (status);


-- ── feature_flag_overrides ───────────────────────────────────────────────────
-- Targeting layer: force a flag on/off for one user OR one role. Exactly one of
-- (user_id, role) is expected to be set per row (enforced by CHECK); app logic
-- resolves user override > role override > base flag.
create table public.feature_flag_overrides (
  id          uuid primary key default gen_random_uuid(),
  flag_id     uuid not null references public.feature_flags (id) on delete cascade,
  -- Per-user target (cascade with the user).
  user_id     uuid references auth.users (id) on delete cascade,
  -- Per-role target (app_role from 0003).
  role        app_role,
  enabled     boolean not null,
  created_at  timestamptz not null default now(),
  -- Target exactly one dimension: a user OR a role, never both, never neither.
  constraint feature_flag_overrides_target_ck
    check ((user_id is not null) <> (role is not null))
);
comment on table public.feature_flag_overrides is
  'Per-user or per-role targeting overrides layered on top of a feature_flag.';

create index feature_flag_overrides_flag_idx
  on public.feature_flag_overrides (flag_id);
-- Resolve a given user's overrides quickly.
create index feature_flag_overrides_user_idx
  on public.feature_flag_overrides (user_id) where user_id is not null;


-- ── updated_at triggers (mutable tables only) ────────────────────────────────
create trigger set_updated_at before update on public.system_settings
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.feature_flags
  for each row execute function app.set_updated_at();


-- ============================================================================
-- Row-Level Security
-- Every table below is RLS-enabled with explicit, least-privilege policies.
-- ============================================================================
alter table public.notifications           enable row level security;
alter table public.audit_logs              enable row level security;
alter table public.activity_logs           enable row level security;
alter table public.system_settings         enable row level security;
alter table public.feature_flags           enable row level security;
alter table public.feature_flag_overrides  enable row level security;


-- ── notifications ────────────────────────────────────────────────────────────
-- Recipient reads their own; admins read within their org.
create policy notifications_read on public.notifications
  for select using (
    user_id = auth.uid()
    or (app.is_admin() and organisation_id = app.current_org_id())
  );

-- Recipient may update (only to flip read_at); they cannot reassign ownership or
-- move the row to another tenant (WITH CHECK re-asserts both keys).
create policy notifications_owner_update on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inserts are server-side (service role bypasses RLS). Admins may also create
-- notifications within their own org (e.g. broadcasts) via the client.
create policy notifications_admin_insert on public.notifications
  for insert with check (
    app.is_admin() and organisation_id = app.current_org_id()
  );


-- ── audit_logs (APPEND-ONLY: read-only for everyone; no update/delete) ────────
-- Admins read their tenant's trail; super-admins read platform-wide (incl. the
-- organisation_id IS NULL platform rows).
create policy audit_logs_admin_read on public.audit_logs
  for select using (
    app.is_super_admin()
    or (app.is_admin() and organisation_id = app.current_org_id())
  );
-- No INSERT policy: writes happen server-side under the service role only, so
-- the trail cannot be forged from a user session. No UPDATE/DELETE by design.


-- ── activity_logs (APPEND-ONLY) ──────────────────────────────────────────────
-- Users read their own activity; staff/admin read within their org.
create policy activity_logs_read on public.activity_logs
  for select using (
    user_id = auth.uid()
    or app.is_super_admin()
    or (app.is_staff() and organisation_id = app.current_org_id())
  );
-- No INSERT/UPDATE/DELETE policies: appended server-side under the service role.


-- ── system_settings ──────────────────────────────────────────────────────────
-- Public rows are readable by everyone (bootstrap before auth); private rows by
-- admins within their org, super-admins everywhere (incl. global rows).
create policy system_settings_read on public.system_settings
  for select using (
    is_public
    or app.is_super_admin()
    or (app.is_admin() and organisation_id = app.current_org_id())
  );

-- Writes: super-admins manage global + any tenant; org admins manage only their
-- own tenant's rows (never the platform-global NULL rows).
create policy system_settings_admin_write on public.system_settings
  for all using (
    app.is_super_admin()
    or (app.is_admin() and organisation_id = app.current_org_id())
  )
  with check (
    app.is_super_admin()
    or (app.is_admin() and organisation_id = app.current_org_id())
  );


-- ── feature_flags ────────────────────────────────────────────────────────────
-- Staff READ (so gated UI can render); global + own-tenant flags are visible.
create policy feature_flags_staff_read on public.feature_flags
  for select using (
    organisation_id is null
    or app.is_super_admin()
    or (app.is_staff() and organisation_id = app.current_org_id())
  );

-- Writes: super-admins manage all; org admins manage only their tenant's flags.
create policy feature_flags_admin_write on public.feature_flags
  for all using (
    app.is_super_admin()
    or (app.is_admin() and organisation_id = app.current_org_id())
  )
  with check (
    app.is_super_admin()
    or (app.is_admin() and organisation_id = app.current_org_id())
  );


-- ── feature_flag_overrides ───────────────────────────────────────────────────
-- Staff READ overrides for any flag they can see (mirrors flag visibility).
create policy feature_flag_overrides_staff_read on public.feature_flag_overrides
  for select using (
    app.is_staff()
    and exists (
      select 1 from public.feature_flags f
      where f.id = feature_flag_overrides.flag_id
        and (
          f.organisation_id is null
          or app.is_super_admin()
          or f.organisation_id = app.current_org_id()
        )
    )
  );

-- Writes: admins manage overrides for flags in their tenant; super-admins any.
create policy feature_flag_overrides_admin_write on public.feature_flag_overrides
  for all using (
    app.is_super_admin()
    or (
      app.is_admin()
      and exists (
        select 1 from public.feature_flags f
        where f.id = feature_flag_overrides.flag_id
          and (f.organisation_id is null or f.organisation_id = app.current_org_id())
      )
    )
  )
  with check (
    app.is_super_admin()
    or (
      app.is_admin()
      and exists (
        select 1 from public.feature_flags f
        where f.id = feature_flag_overrides.flag_id
          and (f.organisation_id is null or f.organisation_id = app.current_org_id())
      )
    )
  );
