-- ============================================================================
-- 0014 · AI platform management (Phase 3)
--
-- Everything the admin platform manages that is NOT already modelled: prompt
-- management (versioned, workflowed), safety policies, knowledge collections,
-- the analytics foundation, and playground/run logs. The governing principle of
-- Phase 3 — "build once, configure forever" — means all of this is DATA:
-- prompts, personalities, temperatures, tools, safety rules and model choices
-- live in these tables and are edited from the admin dashboard, never in code.
-- ============================================================================

set check_function_bodies = off;

-- ── Prompt management ────────────────────────────────────────────────────────
-- The different kinds of prompt/content block that compose an agent's behaviour.
create type prompt_kind as enum (
  'system',        -- the core system prompt
  'developer',     -- developer/operator instructions
  'instruction',   -- a reusable instruction block
  'behaviour',     -- a behaviour rule set
  'restriction',   -- explicit restrictions
  'safety',        -- safety directives
  'style',         -- conversation style / tone
  'welcome'        -- the welcome / greeting message
);

-- A named prompt owned by an agent (or org-global when agent_id is null). The
-- current published version is tracked; history lives in ai_prompt_versions.
create table public.ai_prompts (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  agent_id         uuid references public.ai_agents (id) on delete cascade,
  kind             prompt_kind not null,
  name             text not null,
  description      text,
  current_version  int not null default 1,
  publish_status   publish_status not null default 'draft',
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.ai_prompts is
  'A managed prompt/content block (system, developer, instruction, behaviour, restriction, safety, style, welcome). Agent-scoped or org-global.';

-- Immutable version history for a prompt. Editing creates a new draft version;
-- publishing promotes it; rollback re-points current_version at an older row.
create table public.ai_prompt_versions (
  id            uuid primary key default gen_random_uuid(),
  prompt_id     uuid not null references public.ai_prompts (id) on delete cascade,
  version       int not null,
  content       text not null,
  publish_status publish_status not null default 'draft',
  change_note   text,
  created_by    uuid references auth.users (id) on delete set null,
  approved_by   uuid references auth.users (id) on delete set null,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (prompt_id, version)
);
comment on table public.ai_prompt_versions is
  'Immutable prompt version history: drafts, approvals, publishing and rollback targets.';

-- ── Safety policies ──────────────────────────────────────────────────────────
create table public.ai_safety_policies (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  name             text not null,
  description      text,
  -- Configurable rule sets (editable in admin — nothing hardcoded).
  allowed_topics       text[] not null default '{}',
  restricted_topics    text[] not null default '{}',
  medical_boundaries   text[] not null default '{}',
  emergency_responses  jsonb not null default '{}'::jsonb,
  content_filters      jsonb not null default '{}'::jsonb,
  escalation_rules     jsonb not null default '{}'::jsonb,
  role_restrictions    app_role[] not null default '{}',
  confidence_threshold numeric not null default 0.7,
  human_escalation     boolean not null default true,
  status               record_status not null default 'active',
  created_by           uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on table public.ai_safety_policies is
  'Configurable AI safety policies: allowed/restricted topics, medical boundaries, escalation, filters, thresholds.';

-- Which safety policy applies to which agent (many-to-many).
create table public.ai_agent_safety_policies (
  agent_id   uuid not null references public.ai_agents (id) on delete cascade,
  policy_id  uuid not null references public.ai_safety_policies (id) on delete cascade,
  primary key (agent_id, policy_id)
);

-- ── Knowledge collections (curated sets, distinct from categories) ───────────
create table public.knowledge_collections (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  slug             citext not null,
  name             text not null,
  description      text,
  status           record_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organisation_id, slug)
);
comment on table public.knowledge_collections is
  'Curated sets of documents (e.g. an agent''s reading list), independent of the category tree.';

create table public.knowledge_collection_documents (
  collection_id uuid not null references public.knowledge_collections (id) on delete cascade,
  document_id   uuid not null references public.knowledge_documents (id) on delete cascade,
  sort_order    int not null default 0,
  primary key (collection_id, document_id)
);

-- ── Analytics foundation ─────────────────────────────────────────────────────
-- Fine-grained event stream (append-only) + a daily rollup for dashboards.
create type analytics_event_type as enum (
  'conversation_started', 'message_sent', 'knowledge_retrieved', 'feedback_given',
  'escalated', 'agent_run', 'token_usage'
);

create table public.analytics_events (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  event_type      analytics_event_type not null,
  agent_id        uuid,
  user_id         uuid references auth.users (id) on delete set null,
  conversation_id uuid,
  properties      jsonb not null default '{}'::jsonb,
  tokens_input    int,
  tokens_output   int,
  cost_micros     bigint,          -- cost in millionths of the org currency
  latency_ms      int,
  created_at      timestamptz not null default now()
);
comment on table public.analytics_events is
  'Append-only analytics event stream feeding the AI analytics dashboards.';

create table public.analytics_daily_rollup (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  day             date not null,
  agent_id        uuid,
  conversations   int not null default 0,
  messages        int not null default 0,
  active_users    int not null default 0,
  escalations     int not null default 0,
  tokens_input    bigint not null default 0,
  tokens_output   bigint not null default 0,
  cost_micros     bigint not null default 0,
  avg_latency_ms  int not null default 0,
  satisfaction    numeric,
  unique (organisation_id, day, agent_id)
);
comment on table public.analytics_daily_rollup is
  'Pre-aggregated daily metrics per agent for fast dashboard widgets.';

-- ── Playground / run logs ────────────────────────────────────────────────────
-- Every AI run (playground or, later, production) is logged for observability.
-- Playground runs are flagged so they never affect production analytics.
create table public.ai_run_logs (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  agent_id         uuid,
  prompt_version_id uuid references public.ai_prompt_versions (id) on delete set null,
  actor_id         uuid references auth.users (id) on delete set null,
  is_playground    boolean not null default false,
  input            text,
  output           text,
  retrieved_knowledge jsonb not null default '[]'::jsonb,
  tokens_input     int,
  tokens_output    int,
  latency_ms       int,
  status           text not null default 'ok',
  created_at       timestamptz not null default now()
);
comment on table public.ai_run_logs is
  'Observability log for AI runs. Playground runs (is_playground=true) are isolated from production.';

create index on public.ai_prompts (organisation_id, agent_id, kind);
create index on public.ai_prompt_versions (prompt_id, version desc);
create index on public.ai_safety_policies (organisation_id, status);
create index on public.knowledge_collections (organisation_id, status);
create index on public.analytics_events (organisation_id, event_type, created_at desc);
create index on public.analytics_daily_rollup (organisation_id, day desc);
create index on public.ai_run_logs (organisation_id, is_playground, created_at desc);

create trigger set_updated_at before update on public.ai_prompts
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.ai_safety_policies
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.knowledge_collections
  for each row execute function app.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.ai_prompts enable row level security;
alter table public.ai_prompt_versions enable row level security;
alter table public.ai_safety_policies enable row level security;
alter table public.ai_agent_safety_policies enable row level security;
alter table public.knowledge_collections enable row level security;
alter table public.knowledge_collection_documents enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_daily_rollup enable row level security;
alter table public.ai_run_logs enable row level security;

-- Prompt + safety + collection management: staff read (to render admin UI),
-- admins (or holders of agents.configure) manage. Scoped to the org.
create policy prompts_read on public.ai_prompts
  for select using (organisation_id = app.current_org_id() and app.is_staff());
create policy prompts_write on public.ai_prompts
  for all using (organisation_id = app.current_org_id() and (app.is_admin() or app.has_permission('agents.configure')))
  with check (organisation_id = app.current_org_id() and (app.is_admin() or app.has_permission('agents.configure')));

create policy prompt_versions_read on public.ai_prompt_versions
  for select using (exists (
    select 1 from public.ai_prompts p
    where p.id = ai_prompt_versions.prompt_id and p.organisation_id = app.current_org_id() and app.is_staff()));
create policy prompt_versions_write on public.ai_prompt_versions
  for all using (exists (
    select 1 from public.ai_prompts p
    where p.id = ai_prompt_versions.prompt_id and p.organisation_id = app.current_org_id() and app.is_admin()))
  with check (exists (
    select 1 from public.ai_prompts p
    where p.id = ai_prompt_versions.prompt_id and p.organisation_id = app.current_org_id() and app.is_admin()));

create policy safety_read on public.ai_safety_policies
  for select using (organisation_id = app.current_org_id() and app.is_staff());
create policy safety_write on public.ai_safety_policies
  for all using (organisation_id = app.current_org_id() and app.is_admin())
  with check (organisation_id = app.current_org_id() and app.is_admin());

create policy agent_safety_admin on public.ai_agent_safety_policies
  for all using (app.is_admin()) with check (app.is_admin());

create policy collections_read on public.knowledge_collections
  for select using (organisation_id = app.current_org_id() and app.is_staff());
create policy collections_write on public.knowledge_collections
  for all using (organisation_id = app.current_org_id() and (app.is_admin() or app.has_permission('knowledge.edit')))
  with check (organisation_id = app.current_org_id() and (app.is_admin() or app.has_permission('knowledge.edit')));

create policy collection_docs_read on public.knowledge_collection_documents
  for select using (exists (
    select 1 from public.knowledge_collections c
    where c.id = knowledge_collection_documents.collection_id and c.organisation_id = app.current_org_id() and app.is_staff()));
create policy collection_docs_write on public.knowledge_collection_documents
  for all using (app.is_admin() or app.has_permission('knowledge.edit'))
  with check (app.is_admin() or app.has_permission('knowledge.edit'));

-- Analytics: staff read within org (analytics.read); append-only inserts server-side.
create policy analytics_events_read on public.analytics_events
  for select using (organisation_id = app.current_org_id() and app.is_staff());
create policy analytics_rollup_read on public.analytics_daily_rollup
  for select using (organisation_id = app.current_org_id() and app.is_staff());

-- Run logs: staff read within org; playground runs owned by their actor too.
create policy run_logs_read on public.ai_run_logs
  for select using (organisation_id = app.current_org_id() and (app.is_staff() or actor_id = auth.uid()));
