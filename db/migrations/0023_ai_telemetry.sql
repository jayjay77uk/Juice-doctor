-- 0023_ai_telemetry.sql
-- Increment K: richer per-call AI telemetry on ai_run_logs — estimated cost, the
-- actually-invoked provider model, and a correlation trace id — plus an index that
-- supports per-user daily/monthly usage counting. Additive + idempotent.

alter table public.ai_run_logs add column if not exists cost_micros bigint;
alter table public.ai_run_logs add column if not exists model text;
alter table public.ai_run_logs add column if not exists trace_id text;

comment on column public.ai_run_logs.cost_micros is 'Estimated USD cost in micro-dollars (never billed; from token usage).';
comment on column public.ai_run_logs.model is 'The provider model actually invoked for this call.';
comment on column public.ai_run_logs.trace_id is 'Correlation id linking this row to the provider call + logs.';

-- Per-user time-window counting (daily/monthly usage limits) reads by actor_id.
create index if not exists ai_run_logs_actor_time_idx
  on public.ai_run_logs (organisation_id, actor_id, created_at desc)
  where actor_id is not null and is_playground = false;
