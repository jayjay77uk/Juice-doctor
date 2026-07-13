-- 0020_herne_agent_config.sql
-- The eight HERNE specialists live in ai_agents (they flow through the existing
-- agent/chat/retrieval system). This jsonb carries the HERNE-specific config that
-- the base ai_agents columns do not cover: consultation principle, philosophy,
-- allowed/prohibited actions, wearable access, HERNE priority, referral style,
-- output format, and client-approval status flags. Additive + idempotent.

alter table public.ai_agents
  add column if not exists herne_config jsonb;

create index if not exists ai_agents_herne_specialist_idx
  on public.ai_agents ((herne_config ->> 'specialistId'))
  where herne_config is not null;
