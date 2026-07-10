-- ============================================================================
-- 0001 · Extensions, shared enums, and RLS helper functions
--
-- The foundation every later migration builds on. Establishes the conventions
-- used platform-wide:
--   • UUID v4 primary keys (gen_random_uuid)
--   • created_at / updated_at timestamps with an auto-update trigger
--   • a single role hierarchy expressed as an ordered enum
--   • multi-tenancy via organisation_id (nullable until an org owns a row)
--   • SECURITY DEFINER helper functions that RLS policies call, so policies
--     stay short, consistent, and centrally maintained.
--
-- PROTOTYPE NOTE: these migrations are the production database DESIGN. They are
-- not executed by the prototype (which runs on typed mock providers). They are
-- the source of truth from which the TypeScript model in src/types/db is derived.
-- Dialect: PostgreSQL 15+ / Supabase.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";      -- gen_random_uuid(), digest()
create extension if not exists "citext";         -- case-insensitive email/text
create extension if not exists "pg_trgm";        -- fuzzy text search (knowledge)
-- Enabled when vector search ships (Phase 3+). Declared here so the dependency
-- is explicit; knowledge_embeddings.embedding stays a placeholder until then.
-- create extension if not exists "vector";       -- pgvector for embeddings

-- ── Schemas ─────────────────────────────────────────────────────────────────
-- Supabase provides `auth` (auth.users, auth.uid()). Application data lives in
-- `public`; a dedicated `app` schema holds helper functions kept out of the API.
create schema if not exists app;

-- Allow helper functions below to reference tables created in later migrations
-- (e.g. profiles in 0003). Bodies resolve at call time, not creation time.
set check_function_bodies = off;

-- ── Shared enums ────────────────────────────────────────────────────────────

-- The platform role hierarchy. Ordering matters: later members outrank earlier
-- ones. `has_min_role()` relies on this ordinal ordering. New roles are added
-- with ALTER TYPE ... ADD VALUE in a later migration (never reordered).
create type app_role as enum (
  'guest',                --  0 · unauthenticated / anonymous visitor
  'member',               --  1 · a registered client / patient
  'practitioner',         --  2 · a coach / clinician delivering care
  'staff',                --  3 · operational staff (bookings, content)
  'administrator',        --  4 · org administrator
  'super_administrator'   --  5 · platform owner (cross-org)
);

-- Generic lifecycle status reused by content-like tables.
create type record_status as enum ('draft', 'active', 'archived', 'deleted');

-- Publishing / approval workflow reused by knowledge and programmes.
create type publish_status as enum (
  'draft', 'in_review', 'approved', 'published', 'rejected', 'archived'
);

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function app.set_updated_at is
  'BEFORE UPDATE trigger: stamps updated_at = now(). Attach to every mutable table.';

-- ── Role hierarchy helpers ──────────────────────────────────────────────────

-- Maps a role to its ordinal rank so policies can compare "at least this role".
create or replace function app.role_rank(role app_role)
returns int
language sql
immutable
as $$
  select case role
    when 'guest' then 0
    when 'member' then 1
    when 'practitioner' then 2
    when 'staff' then 3
    when 'administrator' then 4
    when 'super_administrator' then 5
  end;
$$;

-- The current user's effective (highest) role. Reads from public.profiles,
-- which is populated on signup. Defaults to 'guest' when unauthenticated.
-- SECURITY DEFINER so RLS on profiles cannot cause infinite recursion.
create or replace function app.current_role()
returns app_role
language sql
stable
security definer
set search_path = public, app
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'guest'::app_role
  );
$$;

-- True when the current user's role is at least `minimum` in the hierarchy.
create or replace function app.has_min_role(minimum app_role)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select app.role_rank(app.current_role()) >= app.role_rank(minimum);
$$;

create or replace function app.is_staff()
returns boolean language sql stable
as $$ select app.has_min_role('staff'); $$;

create or replace function app.is_admin()
returns boolean language sql stable
as $$ select app.has_min_role('administrator'); $$;

create or replace function app.is_super_admin()
returns boolean language sql stable
as $$ select app.current_role() = 'super_administrator'; $$;

-- ── Multi-tenancy helper ────────────────────────────────────────────────────
-- The organisation the current user belongs to (nullable for platform users /
-- guests). Defined here; the organisations + memberships tables arrive in 0002.
-- Kept SECURITY DEFINER so tenant checks never leak other orgs' rows.
create or replace function app.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, app
as $$
  select organisation_id from public.profiles where id = auth.uid();
$$;

comment on schema app is
  'Internal helper functions and privileged logic, kept out of the public API surface.';
