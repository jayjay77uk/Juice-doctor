-- 0022_herne_wearable.sql
-- HERNE wearable foundation — Thryve-ready but NOT connected. One normalised
-- wearable intelligence layer: providers, connections, consent, normalised
-- measurements, summaries/trends, sync + quality logs, AI-access logs and
-- escalations. RLS on every table; users own their rows. Additive + idempotent.

create table if not exists public.wearable_providers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  key text not null,
  display_name text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organisation_id, key)
);

create table if not exists public.wearable_metric_catalog (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  metric_id text not null,
  name text not null,
  category text,
  unit text,
  source_types text[] not null default '{}',
  specialist_access text[] not null default '{}',
  interpretation_guidance text,
  limitations text,
  prohibited_claims text,
  trend_suitable boolean not null default true,
  baseline_required boolean not null default true,
  sensitivity text not null default 'standard',
  status text not null default 'client_supplied',
  version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, metric_id)
);

create table if not exists public.user_wearable_connections (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_key text not null,
  status text not null default 'disconnected',
  external_connection_id text,
  connected_at timestamptz,
  revoked_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wearable_devices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.user_wearable_connections(id) on delete set null,
  device_type text,
  external_device_id text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wearable_consents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_key text not null,
  categories text[] not null default '{}',
  purpose text,
  status text not null default 'granted',
  version integer not null default 1,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wearable_measurements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_id text not null,
  canonical_name text,
  value numeric,
  unit text,
  source_provider text,
  source_device text,
  observed_at timestamptz,
  timezone text,
  received_at timestamptz not null default now(),
  personal_baseline numeric,
  deviation numeric,
  data_quality text not null default 'unknown',
  confidence numeric,
  raw_source_ref jsonb not null default '{}'::jsonb,
  consent_status text not null default 'unknown',
  sensitivity text not null default 'standard',
  retention_status text not null default 'active',
  created_at timestamptz not null default now()
);
create index if not exists wearable_measurements_user_metric_idx on public.wearable_measurements (user_id, metric_id, observed_at desc);

create table if not exists public.wearable_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_id text not null,
  day date not null,
  avg numeric, min numeric, max numeric, count integer, coverage numeric,
  created_at timestamptz not null default now(),
  unique (user_id, metric_id, day)
);

create table if not exists public.wearable_trend_summaries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_id text not null,
  "window" text not null,
  average numeric, baseline numeric, deviation numeric,
  direction text, confidence numeric, coverage numeric, missing_notice text,
  computed_at timestamptz not null default now()
);

create table if not exists public.wearable_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  connection_id uuid references public.user_wearable_connections(id) on delete set null,
  status text not null default 'queued',
  metrics_synced integer not null default 0,
  started_at timestamptz, finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wearable_sync_failures (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  connection_id uuid references public.user_wearable_connections(id) on delete set null,
  reason text not null, detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.wearable_data_quality_flags (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_id text, measurement_id uuid, issue text not null, detail text, severity text,
  created_at timestamptz not null default now()
);

create table if not exists public.wearable_access_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  specialist text not null, metric_ids text[] not null default '{}', purpose text, granted boolean not null default true, reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.wearable_ai_context_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  specialist text not null, context jsonb not null default '{}'::jsonb, metric_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wearable_escalations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  metric_id text, trigger text not null, reason text, specialist text, destination text, urgency text,
  created_at timestamptz not null default now()
);

-- Row Level Security: users see only their own rows; catalogue/providers are org-readable.
do $$
declare t text;
begin
  foreach t in array array[
    'wearable_providers','wearable_metric_catalog','user_wearable_connections','wearable_devices',
    'wearable_consents','wearable_measurements','wearable_daily_summaries','wearable_trend_summaries',
    'wearable_sync_jobs','wearable_sync_failures','wearable_data_quality_flags','wearable_access_logs',
    'wearable_ai_context_logs','wearable_escalations'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Self-access policies for user-owned tables.
  foreach t in array array[
    'user_wearable_connections','wearable_devices','wearable_consents','wearable_measurements',
    'wearable_daily_summaries','wearable_trend_summaries','wearable_sync_jobs','wearable_sync_failures',
    'wearable_data_quality_flags','wearable_access_logs','wearable_ai_context_logs','wearable_escalations'
  ] loop
    execute format('drop policy if exists %I_self on public.%I', t, t);
    execute format('create policy %I_self on public.%I for select using (user_id = auth.uid())', t, t);
  end loop;

  -- Org-readable reference tables.
  foreach t in array array['wearable_providers','wearable_metric_catalog'] loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (true)', t, t);
  end loop;
end $$;
