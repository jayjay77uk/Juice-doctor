-- 0017_ai_agents_extend.sql
-- Bring the ai_agents table up to the current AiAgent model (fields added after
-- migration 0009: code, purpose, welcome_message, response_boundaries,
-- follow_up_config, escalation_config, subscription_available) and prepare it to
-- be the real source of truth for agents. Additive + idempotent — safe on live.

alter table public.ai_agents
  add column if not exists code text not null default '',
  add column if not exists purpose text,
  add column if not exists welcome_message text,
  add column if not exists response_boundaries text,
  add column if not exists follow_up_config jsonb not null default '{}'::jsonb,
  add column if not exists escalation_config jsonb not null default '{}'::jsonb,
  add column if not exists subscription_available boolean not null default false;

-- One agent per (organisation, slug) — supports idempotent upsert seeding.
create unique index if not exists ai_agents_org_slug_uniq
  on public.ai_agents (organisation_id, slug);

-- Seed the single prototype organisation the agents belong to (organisation_id
-- is a NOT NULL FK). Fixed id matches the code seed (PROTOTYPE_ORG).
insert into public.organisations (id, slug, name)
values ('00000000-0000-0000-0000-000000000001', 'prototype', 'Prototype Organisation')
on conflict (id) do nothing;

-- Attach existing (org-less) profiles to the prototype organisation so sessions
-- carry a coherent organisationId.
update public.profiles
set organisation_id = '00000000-0000-0000-0000-000000000001'
where organisation_id is null;
