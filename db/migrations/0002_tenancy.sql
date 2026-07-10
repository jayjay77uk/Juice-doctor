-- ============================================================================
-- 0002 · Multi-tenancy: organisations, clinics, memberships
--
-- Designed up front so the platform can host multiple organisations and clinics
-- WITHOUT a later re-architecture (a Phase-2 hard requirement). In the single-
-- tenant prototype exactly one organisation row exists and organisation_id is
-- effectively constant — but every tenant-scoped table already carries the
-- column and RLS already enforces isolation, so going multi-tenant is data, not
-- code.
-- ============================================================================

-- An organisation is the top-level tenant (a company / brand running the platform).
create table public.organisations (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text not null,
  legal_name    text,
  status        record_status not null default 'active',
  -- Default locale + supported locales enable future multi-language per tenant.
  default_locale text not null default 'en-GB',
  locales       text[] not null default array['en-GB'],
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.organisations is 'Top-level tenant. One row in the prototype; many in production.';

-- A clinic is a physical or virtual location within an organisation. Practitioners
-- and appointments belong to a clinic, enabling multi-clinic operations.
create table public.clinics (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  slug            citext not null,
  name            text not null,
  timezone        text not null default 'Europe/London',
  address         jsonb,
  status          record_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organisation_id, slug)
);
comment on table public.clinics is 'A location (physical or virtual) within an organisation.';

-- Explicit membership join. A user MAY belong to multiple organisations with a
-- different role in each (future); profiles.organisation_id records the active one.
create table public.organisation_memberships (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            app_role not null default 'member',
  clinic_id       uuid references public.clinics (id) on delete set null,
  status          record_status not null default 'active',
  invited_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organisation_id, user_id)
);
comment on table public.organisation_memberships is
  'Which users belong to which organisation, and their role there.';

create index on public.clinics (organisation_id, status);
create index on public.organisation_memberships (user_id);
create index on public.organisation_memberships (organisation_id, role);

create trigger set_updated_at before update on public.organisations
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.clinics
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.organisation_memberships
  for each row execute function app.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.organisations enable row level security;
alter table public.clinics enable row level security;
alter table public.organisation_memberships enable row level security;

-- Organisation: members read their own org; only admins update; only super-admin
-- may create/delete organisations (a platform-level operation).
create policy org_read on public.organisations
  for select using (id = app.current_org_id() or app.is_super_admin());
create policy org_update on public.organisations
  for update using (id = app.current_org_id() and app.is_admin())
  with check (id = app.current_org_id() and app.is_admin());
create policy org_super_all on public.organisations
  for all using (app.is_super_admin()) with check (app.is_super_admin());

-- Clinics: readable within the org; managed by staff+.
create policy clinic_read on public.clinics
  for select using (organisation_id = app.current_org_id() or app.is_super_admin());
create policy clinic_write on public.clinics
  for all using (organisation_id = app.current_org_id() and app.is_staff())
  with check (organisation_id = app.current_org_id() and app.is_staff());

-- Memberships: a user sees their own; admins manage their org's memberships.
create policy membership_self_read on public.organisation_memberships
  for select using (user_id = auth.uid() or (organisation_id = app.current_org_id() and app.is_admin()));
create policy membership_admin_write on public.organisation_memberships
  for all using (organisation_id = app.current_org_id() and app.is_admin())
  with check (organisation_id = app.current_org_id() and app.is_admin());
