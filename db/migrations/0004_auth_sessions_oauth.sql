-- ============================================================================
-- 0004 · Auth mechanics: OAuth identities, API keys, auth events
--
-- Supabase Auth owns password/session storage (auth.users, auth.sessions,
-- refresh tokens). These tables model the application-visible surface around it:
--   • linked OAuth identities (future social / SSO login)
--   • machine-to-machine API keys (future public API + integrations)
--   • an auth event log feeding audit + anomaly detection
-- ============================================================================

-- Linked identity providers. Supabase records these internally; mirroring them
-- application-side lets the admin surface "connected accounts" and drive future
-- SSO without waiting on provider internals.
create type auth_provider as enum (
  'password', 'google', 'apple', 'facebook', 'microsoft', 'saml', 'magic_link'
);

create table public.oauth_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  provider        auth_provider not null,
  provider_account_id text not null,
  email           citext,
  connected_at    timestamptz not null default now(),
  last_used_at    timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  unique (provider, provider_account_id)
);
comment on table public.oauth_accounts is 'Linked identity providers per user (future SSO).';

-- Hashed API keys for machine-to-machine access (future public API). Only the
-- hash is stored; the plaintext is shown once at creation.
create table public.api_keys (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name            text not null,
  key_prefix      text not null,             -- first chars, shown in the UI
  key_hash        text not null,             -- sha-256 of the full key
  scopes          text[] not null default '{}',
  created_by      uuid references auth.users (id) on delete set null,
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (key_prefix)
);
comment on table public.api_keys is 'Hashed API keys for M2M access. Plaintext never stored.';

-- Security-relevant auth events (logins, failures, resets, MFA). Append-only.
create type auth_event_type as enum (
  'login_succeeded', 'login_failed', 'logout', 'password_reset_requested',
  'password_changed', 'mfa_enrolled', 'mfa_challenge', 'account_locked', 'token_refreshed'
);

create table public.auth_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete set null,
  event_type      auth_event_type not null,
  ip_address      inet,
  user_agent      text,
  succeeded       boolean not null default true,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
comment on table public.auth_events is 'Append-only auth/security event log for audit + anomaly detection.';

create index on public.oauth_accounts (user_id);
create index on public.api_keys (organisation_id) where revoked_at is null;
create index on public.auth_events (user_id, created_at desc);
create index on public.auth_events (event_type, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.oauth_accounts enable row level security;
alter table public.api_keys enable row level security;
alter table public.auth_events enable row level security;

create policy oauth_self on public.oauth_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- API keys: admins manage their org's keys. key_hash is never selectable by
-- non-admins (whole table is admin-only).
create policy api_keys_admin on public.api_keys
  for all using (organisation_id = app.current_org_id() and app.is_admin())
  with check (organisation_id = app.current_org_id() and app.is_admin());

-- Auth events: a user may read their own; staff+ read all (for support/security).
-- Inserts happen via SECURITY DEFINER server code, so no INSERT policy is exposed.
create policy auth_events_read on public.auth_events
  for select using (user_id = auth.uid() or app.is_staff());
