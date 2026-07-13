-- 0024_message_metadata.sql
-- Increment K: persist the rich per-turn signals the HERNE reply produces so the
-- chat UI can render structured citations, the active specialist, escalation state
-- and language, and so each answer is auditable (prompt/safety version, cost,
-- latency, trace). Additive + idempotent; append-only messages table unchanged
-- except for these nullable columns.

alter table public.messages add column if not exists specialist text;
alter table public.messages add column if not exists language text;
alter table public.messages add column if not exists citations jsonb not null default '[]'::jsonb;
alter table public.messages add column if not exists evidence jsonb not null default '[]'::jsonb;
alter table public.messages add column if not exists escalated boolean not null default false;
alter table public.messages add column if not exists referral jsonb;
alter table public.messages add column if not exists safety_state text;
alter table public.messages add column if not exists latency_ms integer;
alter table public.messages add column if not exists cost_micros bigint;
alter table public.messages add column if not exists trace_id text;
alter table public.messages add column if not exists prompt_version_id uuid;

comment on column public.messages.citations is 'Structured HERNE citations [{recordId,sourceTitle,sourceUrl}].';
comment on column public.messages.escalated is 'True when this turn recommended human/clinical escalation.';
comment on column public.messages.safety_state is 'Safety outcome for the turn: ok | flagged | blocked.';
