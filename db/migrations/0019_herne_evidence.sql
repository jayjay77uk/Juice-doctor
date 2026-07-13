-- 0019_herne_evidence.sql
-- HERNE multi-specialist architecture: the ONE SHARED evidence foundation.
-- Every specialist retrieves from these records; differentiation comes from the
-- per-record specialist_relevance scores + retrieval ranking, NOT separate bases.
-- Additive + idempotent.

create table if not exists public.herne_evidence_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  -- the atomic record identity from the client pack (e.g. HERNE-H-001), preserved.
  record_id citext not null,
  claim text not null,
  document_text text not null,
  primary_pillar text,
  connected_pillars text[] not null default '{}',
  evidence jsonb not null default '{}'::jsonb,
  specialist_relevance jsonb not null default '{}'::jsonb,
  wearable_relevance jsonb not null default '{}'::jsonb,
  safety jsonb not null default '{}'::jsonb,
  response_guidance jsonb not null default '{}'::jsonb,
  version text not null default '1.0',
  status text not null default 'reviewed_seed',
  content_tsv tsvector generated always as (
    to_tsvector('english', coalesce(claim, '') || ' ' || coalesce(document_text, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, record_id)
);

create index if not exists herne_evidence_tsv_idx on public.herne_evidence_records using gin (content_tsv);
create index if not exists herne_evidence_pillar_idx on public.herne_evidence_records (primary_pillar);

-- Deterministic ingestion audit — one row per record action per import run.
create table if not exists public.herne_ingestion_audit (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  record_id text,
  line_number integer,
  action text not null, -- inserted | updated | unchanged | rejected
  detail text,
  version text,
  created_at timestamptz not null default now()
);

create index if not exists herne_ingestion_audit_run_idx on public.herne_ingestion_audit (run_id, line_number);
