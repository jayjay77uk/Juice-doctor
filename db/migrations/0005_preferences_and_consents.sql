-- ============================================================================
-- 0005 · User preferences & consents
--
-- Preferences drive UX (theme, locale, notification channels). Consents form a
-- GDPR-grade, append-only record of what each user agreed to and when — critical
-- for a health platform. Consents are versioned so a policy change re-prompts.
-- ============================================================================

create table public.user_preferences (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  theme              text not null default 'system',   -- 'system' | 'light' | 'dark'
  locale             text not null default 'en-GB',
  timezone           text not null default 'Europe/London',
  -- Per-channel notification switches; extended without migration via jsonb.
  email_notifications  boolean not null default true,
  sms_notifications    boolean not null default false,
  push_notifications   boolean not null default false,
  marketing_opt_in     boolean not null default false,
  preferences          jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.user_preferences is 'Per-user UX + notification preferences.';

-- The kinds of consent the platform tracks. Extended by seeding, not schema.
create type consent_type as enum (
  'terms_of_service', 'privacy_policy', 'medical_disclaimer', 'data_processing',
  'marketing', 'cookies', 'ai_processing', 'health_data_sharing'
);

-- Append-only consent ledger. A new row is written each time consent is given or
-- withdrawn; the current state is the latest row per (user, type).
create table public.user_consents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  consent_type  consent_type not null,
  -- The version of the policy/document the user agreed to, so a new version
  -- can require re-consent.
  document_version text not null,
  granted       boolean not null,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);
comment on table public.user_consents is
  'Append-only GDPR consent ledger. Latest row per (user, type) is the current state.';

create index on public.user_consents (user_id, consent_type, created_at desc);

create trigger set_updated_at before update on public.user_preferences
  for each row execute function app.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.user_preferences enable row level security;
alter table public.user_consents enable row level security;

create policy prefs_self on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Consents: a user manages their own. Staff may READ (to honour data requests),
-- but the ledger is append-only for everyone (no update/delete policy exists, so
-- history cannot be rewritten).
create policy consents_self_read on public.user_consents
  for select using (user_id = auth.uid() or app.is_staff());
create policy consents_self_insert on public.user_consents
  for insert with check (user_id = auth.uid());
