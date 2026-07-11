-- ============================================================================
-- 0009_ai_agents.sql
-- ----------------------------------------------------------------------------
-- Domain: AI AGENT FRAMEWORK (architecture only — NO AI logic / no inference).
--
-- Purpose
--   Provide the data model that lets an organisation stand up UNLIMITED AI
--   agents (a "Receptionist AI", a "Specialist AI 1", an "Assistant AI", …)
--   entirely through configuration rows — never a code deploy. Everything an
--   agent needs to run is data: which model it talks to, its system prompt and
--   personality, which tools it may call, which knowledge it may read, and the
--   safety rules that fence it in.
--
-- Key modelling decisions (the WHY)
--   * Providers → Models are a two-level catalogue so the platform can offer
--     "future model selection" without redeploying: add a row, pick it in an
--     agent. Provider/model rows with organisation_id = NULL are PLATFORM-GLOBAL
--     defaults every tenant can read; a tenant may additionally register its own
--     (BYO-key) provider rows scoped to its organisation_id.
--   * Agents are versioned. ai_agents holds the CURRENT/live config; every save
--     writes an immutable snapshot to ai_agent_versions. This gives us prompt-
--     change audit, diffing, and one-click rollback — critical when a prompt in
--     a health-adjacent product is edited by non-engineers.
--   * Tools live in a registry (ai_tools) and are attached to agents via the
--     join table ai_agent_tools. handler_ref is a STRING pointer to server-side
--     code (resolved by the app, not the DB) so the schema stays logic-free and
--     the client can toggle tool access without a migration. is_sensitive lets
--     admins gate tools that mutate data or touch PHI.
--   * Knowledge sources are referenced by NULLABLE plain uuid columns on purpose.
--     The knowledge_* tables (categories/documents) land in migration 0012; hard
--     FKs here would create a migration-ordering hard-coupling. We keep the
--     columns soft (documented below) and enforce integrity at the app layer.
--   * ai_configurations is a generic org-scoped (or platform-global) key/value
--     store for AI defaults: rate limits, the default agent, global guardrails.
--
-- Security model
--   RLS is MANDATORY on every table. Least privilege throughout:
--     - Catalogue + config + agents: MANAGED by admins within their org
--       (organisation_id = app.current_org_id()); platform-global (NULL-org)
--       rows are managed only by super_administrators.
--     - Staff may READ agent configuration; practitioners may READ ACTIVE agents.
--     - Agents with visibility='public' are readable by ANYONE (public content).
--     - ai_agent_versions is an append-only audit log: readable by staff+,
--       insertable by admins, NEVER updatable or deletable.
--
-- Conventions inherited from 0001–0005 (not redefined here):
--   PK uuid default gen_random_uuid(); created_at/updated_at timestamptz;
--   app.set_updated_at() trigger; auth.users / public.organisations FKs;
--   RLS helpers app.current_org_id(), app.is_staff(), app.is_admin(),
--   app.is_super_admin(), app.has_min_role(app_role), app.current_role().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions (citext is used for case-insensitive agent slugs / lookups).
-- Assumed already installed by earlier migrations; enabled defensively.
-- ---------------------------------------------------------------------------
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Enums (namespaced to the agent domain).
-- ---------------------------------------------------------------------------

-- Who can see/use an agent.
--   private       -> only the owner + org admins/staff
--   organisation  -> any member of the owning organisation
--   public        -> anyone (unauthenticated included), e.g. a public chatbot
do $$ begin
  create type public.agent_visibility as enum ('private', 'organisation', 'public');
exception when duplicate_object then null; end $$;

-- Lifecycle state of an agent configuration.
do $$ begin
  create type public.agent_status as enum ('draft', 'active', 'disabled', 'archived');
exception when duplicate_object then null; end $$;

-- How a knowledge source row participates in an agent's retrieval scope.
--   include -> agent MAY read this category/document
--   exclude -> explicitly deny (takes precedence over broader includes)
do $$ begin
  create type public.agent_knowledge_mode as enum ('include', 'exclude');
exception when duplicate_object then null; end $$;


-- ===========================================================================
-- ai_model_providers
--   Catalogue of LLM providers (Anthropic, etc.). NULL organisation_id ==
--   platform-global default available to every tenant; a non-null value scopes
--   a provider (e.g. a tenant's own key/endpoint) to one organisation.
-- ===========================================================================
create table public.ai_model_providers (
  id              uuid primary key default gen_random_uuid(),
  -- NULL = platform-global (managed by super_administrators only).
  organisation_id uuid references public.organisations (id) on delete cascade,
  key             text not null,                 -- machine key, e.g. 'anthropic'
  display_name    text not null,                 -- human label, e.g. 'Anthropic'
  config          jsonb not null default '{}'::jsonb, -- endpoint/auth ref/opts (NO secrets)
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);
comment on table public.ai_model_providers is
  'Catalogue of LLM providers. organisation_id NULL = platform-global default; non-null scopes the provider to one tenant. config holds non-secret connection options (secrets live in the app vault, referenced by key).';

-- Unique provider key per scope. Two partial unique indexes because NULLs are
-- distinct in a plain UNIQUE constraint (we want ONE global 'anthropic' and ONE
-- 'anthropic' per org).
create unique index ai_model_providers_global_key_uq
  on public.ai_model_providers (key)
  where organisation_id is null;
create unique index ai_model_providers_org_key_uq
  on public.ai_model_providers (organisation_id, key)
  where organisation_id is not null;

create index ai_model_providers_org_idx     on public.ai_model_providers (organisation_id);
create index ai_model_providers_enabled_idx on public.ai_model_providers (enabled);


-- ===========================================================================
-- ai_models
--   Concrete models offered by a provider (e.g. 'claude-opus-4-8'). Powers the
--   future model-selection dropdown; agents reference a model here.
-- ===========================================================================
create table public.ai_models (
  id                uuid primary key default gen_random_uuid(),
  provider_id       uuid not null references public.ai_model_providers (id) on delete cascade,
  model_key         text not null,               -- e.g. 'claude-opus-4-8'
  display_name      text not null,               -- e.g. 'Claude Opus 4.8'
  capabilities      jsonb not null default '{}'::jsonb, -- {vision, tools, streaming, …}
  context_window    integer,                     -- max input tokens (nullable/unknown)
  max_output_tokens integer,                     -- provider cap (nullable/unknown)
  enabled           boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (provider_id, model_key)
);
comment on table public.ai_models is
  'Concrete models per provider (e.g. claude-opus-4-8). Feeds model selection; agents reference a model via ai_agents.default_model_id. Inherits its scope from the parent provider.';

create index ai_models_provider_idx on public.ai_models (provider_id);
create index ai_models_enabled_idx  on public.ai_models (enabled);


-- ===========================================================================
-- ai_tools
--   Registry of tools/functions an agent may call. handler_ref is a string
--   pointer resolved by the application to server-side code — the DB stores NO
--   logic. input_schema is the JSON Schema the model uses for the tool call.
-- ===========================================================================
create table public.ai_tools (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  key             text not null,                 -- machine key, e.g. 'lookup_booking'
  name            text not null,                 -- human label
  description     text,                          -- shown to the model / admins
  input_schema    jsonb not null default '{}'::jsonb, -- JSON Schema for arguments
  handler_ref     text,                          -- app-resolved pointer to code (NOT executed by DB)
  is_sensitive    boolean not null default false, -- gate tools that mutate/touch PHI
  enabled         boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organisation_id, key)
);
comment on table public.ai_tools is
  'Registry of callable tools per organisation. handler_ref points at server-side code resolved by the app (DB stores no logic). is_sensitive flags tools that mutate data or touch protected health information.';

create index ai_tools_org_idx       on public.ai_tools (organisation_id);
create index ai_tools_enabled_idx   on public.ai_tools (enabled);
create index ai_tools_sensitive_idx on public.ai_tools (is_sensitive);

create trigger set_updated_at before update on public.ai_tools
  for each row execute function app.set_updated_at();


-- ===========================================================================
-- ai_agents
--   The live/current configuration of an agent. Everything needed to run it is
--   here as data; edits bump `version` and snapshot into ai_agent_versions.
-- ===========================================================================
create table public.ai_agents (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.organisations (id) on delete cascade,
  slug              citext not null,             -- URL/lookup handle, case-insensitive
  name              text not null,
  description       text,
  role              text,                        -- short role label, e.g. 'Specialist AI 1'
  personality       text,                        -- tone/voice guidance
  system_prompt     text,                        -- the operative system prompt
  temperature       numeric not null default 0.7,
  max_output_tokens integer,                     -- per-agent override (null = model/global default)
  -- Nullable so an agent can be drafted before a model is chosen; set null on
  -- model delete rather than cascading away the whole agent.
  default_model_id  uuid references public.ai_models (id) on delete set null,
  memory_config     jsonb not null default '{}'::jsonb, -- memory strategy/window config
  safety_rules      jsonb not null default '{}'::jsonb, -- guardrails/refusal policy
  visibility        public.agent_visibility not null default 'private',
  status            public.agent_status     not null default 'draft',
  version           integer not null default 1,  -- current version pointer
  owner_id          uuid not null references auth.users (id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organisation_id, slug),
  constraint ai_agents_temperature_range check (temperature >= 0 and temperature <= 2)
);
comment on table public.ai_agents is
  'Live configuration of a configurable AI agent. Fully data-driven so new agents need no code deploy. version points at the current row in ai_agent_versions; edits should write a new immutable snapshot there.';

create index ai_agents_org_idx        on public.ai_agents (organisation_id);
create index ai_agents_owner_idx      on public.ai_agents (owner_id);
create index ai_agents_status_idx     on public.ai_agents (status);
create index ai_agents_visibility_idx on public.ai_agents (visibility);
create index ai_agents_model_idx      on public.ai_agents (default_model_id);
-- Fast "active public agents" and org listings.
create index ai_agents_org_status_idx on public.ai_agents (organisation_id, status);

create trigger set_updated_at before update on public.ai_agents
  for each row execute function app.set_updated_at();


-- ===========================================================================
-- ai_agent_versions
--   Immutable version history of an agent. Each row is a full snapshot of the
--   agent config at a point in time. Enables audit of prompt changes, diffing,
--   and rollback. APPEND-ONLY: no update/delete policies.
-- ===========================================================================
create table public.ai_agent_versions (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.ai_agents (id) on delete cascade,
  version     integer not null,                 -- matches ai_agents.version at capture time
  snapshot    jsonb not null,                   -- full agent config at this version
  change_note text,                             -- why the change was made
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (agent_id, version)
);
comment on table public.ai_agent_versions is
  'Append-only version history / audit trail of ai_agents. snapshot is the complete agent config at each version; supports prompt-change audit, diffing, and rollback. No updates or deletes.';

-- desc for newest-first history reads.
create index ai_agent_versions_agent_idx on public.ai_agent_versions (agent_id, version desc);
create index ai_agent_versions_created_idx on public.ai_agent_versions (created_at desc);


-- ===========================================================================
-- ai_agent_tools
--   Which tools an agent is allowed to call, plus per-attachment config.
--   PK is the pair (agent_id, tool_id) — a tool is attached at most once.
-- ===========================================================================
create table public.ai_agent_tools (
  agent_id uuid not null references public.ai_agents (id) on delete cascade,
  tool_id  uuid not null references public.ai_tools  (id) on delete cascade,
  config   jsonb not null default '{}'::jsonb,   -- per-agent overrides for this tool
  primary key (agent_id, tool_id)
);
comment on table public.ai_agent_tools is
  'Join table: the set of tools each agent may call. config holds per-agent overrides for the attached tool. Both sides cascade on delete.';

-- PK covers (agent_id, tool_id); add reverse index for "who uses this tool".
create index ai_agent_tools_tool_idx on public.ai_agent_tools (tool_id);


-- ===========================================================================
-- ai_agent_knowledge_sources
--   Which knowledge (categories/documents) an agent may read. FKs are
--   INTENTIONALLY SOFT: the knowledge_* tables land in migration 0012, so we
--   store plain nullable uuids here to avoid migration-ordering coupling.
--   Referential integrity for category_id/document_id is enforced by the app.
-- ===========================================================================
create table public.ai_agent_knowledge_sources (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.ai_agents (id) on delete cascade,
  -- SOFT reference to public.knowledge_categories (added in 0012) — no FK here.
  category_id uuid,
  -- SOFT reference to public.knowledge_documents (added in 0012) — no FK here.
  document_id uuid,
  mode        public.agent_knowledge_mode not null default 'include',
  created_at  timestamptz not null default now(),
  -- At least one of category_id / document_id must be set for a meaningful row.
  constraint ai_agent_knowledge_sources_target_present
    check (category_id is not null or document_id is not null)
);
comment on table public.ai_agent_knowledge_sources is
  'Allowed knowledge scope per agent. category_id/document_id are SOFT (plain uuid) references to knowledge_* tables introduced in migration 0012 — no hard FK here to avoid migration-ordering coupling; integrity is enforced at the app layer. mode=exclude denies a source and takes precedence over includes.';

create index ai_agent_knowledge_sources_agent_idx    on public.ai_agent_knowledge_sources (agent_id);
create index ai_agent_knowledge_sources_category_idx on public.ai_agent_knowledge_sources (category_id);
create index ai_agent_knowledge_sources_document_idx on public.ai_agent_knowledge_sources (document_id);


-- ===========================================================================
-- ai_configurations
--   Generic key/value store for AI defaults. NULL organisation_id ==
--   platform-global default; non-null overrides per tenant. Examples:
--   rate limits, default agent slug, global guardrails.
-- ===========================================================================
create table public.ai_configurations (
  id              uuid primary key default gen_random_uuid(),
  -- NULL = platform-global default (managed by super_administrators).
  organisation_id uuid references public.organisations (id) on delete cascade,
  key             text not null,                 -- e.g. 'rate_limit.per_minute'
  value           jsonb not null default '{}'::jsonb,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.ai_configurations is
  'Key/value store for AI defaults (rate limits, default agent, guardrails). organisation_id NULL = platform-global default; a non-null row overrides for that tenant.';

-- One key per scope; NULLs are distinct under plain UNIQUE, so use two partial
-- unique indexes (one global row per key, one per org per key).
create unique index ai_configurations_global_key_uq
  on public.ai_configurations (key)
  where organisation_id is null;
create unique index ai_configurations_org_key_uq
  on public.ai_configurations (organisation_id, key)
  where organisation_id is not null;

create index ai_configurations_org_idx on public.ai_configurations (organisation_id);

create trigger set_updated_at before update on public.ai_configurations
  for each row execute function app.set_updated_at();


-- ###########################################################################
-- ROW LEVEL SECURITY
--   Enable on every table, then explicit least-privilege policies.
--   Recurring pattern for scoped catalogue/config/agents:
--     * platform-global (organisation_id IS NULL): manage = super_admin only.
--     * tenant rows: manage = admin within app.current_org_id().
--     * read: staff+ within org (and global rows visible to all authenticated).
-- ###########################################################################

-- ---------------------------------------------------------------------------
-- ai_model_providers
-- ---------------------------------------------------------------------------
alter table public.ai_model_providers enable row level security;

-- READ: any authenticated user may see enabled global providers or providers in
-- their own org; super_admins see everything. (Needed to render model pickers.)
create policy ai_model_providers_read on public.ai_model_providers
  for select to authenticated
  using (
    app.is_super_admin()
    or organisation_id is null
    or organisation_id = app.current_org_id()
  );

-- WRITE: admins manage their org's providers; only super_admins manage global.
create policy ai_model_providers_write on public.ai_model_providers
  for all to authenticated
  using (
    (organisation_id is null and app.is_super_admin())
    or (organisation_id = app.current_org_id() and app.is_admin())
  )
  with check (
    (organisation_id is null and app.is_super_admin())
    or (organisation_id = app.current_org_id() and app.is_admin())
  );


-- ---------------------------------------------------------------------------
-- ai_models  (scope is inherited from the parent provider row)
-- ---------------------------------------------------------------------------
alter table public.ai_models enable row level security;

-- READ: visible when the parent provider is visible to the caller.
create policy ai_models_read on public.ai_models
  for select to authenticated
  using (
    exists (
      select 1 from public.ai_model_providers p
      where p.id = ai_models.provider_id
        and (
          app.is_super_admin()
          or p.organisation_id is null
          or p.organisation_id = app.current_org_id()
        )
    )
  );

-- WRITE: mirrors provider management rights (global = super_admin, org = admin).
create policy ai_models_write on public.ai_models
  for all to authenticated
  using (
    exists (
      select 1 from public.ai_model_providers p
      where p.id = ai_models.provider_id
        and (
          (p.organisation_id is null and app.is_super_admin())
          or (p.organisation_id = app.current_org_id() and app.is_admin())
        )
    )
  )
  with check (
    exists (
      select 1 from public.ai_model_providers p
      where p.id = ai_models.provider_id
        and (
          (p.organisation_id is null and app.is_super_admin())
          or (p.organisation_id = app.current_org_id() and app.is_admin())
        )
    )
  );


-- ---------------------------------------------------------------------------
-- ai_tools
-- ---------------------------------------------------------------------------
alter table public.ai_tools enable row level security;

-- READ: staff and above within the owning org (tools are internal config).
create policy ai_tools_read on public.ai_tools
  for select to authenticated
  using (
    app.is_super_admin()
    or (organisation_id = app.current_org_id() and app.is_staff())
  );

-- WRITE: admins within the owning org (super_admin override for support).
create policy ai_tools_write on public.ai_tools
  for all to authenticated
  using (
    app.is_super_admin()
    or (organisation_id = app.current_org_id() and app.is_admin())
  )
  with check (
    app.is_super_admin()
    or (organisation_id = app.current_org_id() and app.is_admin())
  );


-- ---------------------------------------------------------------------------
-- ai_agents
--   Reads are layered: public agents -> everyone; org members -> org agents;
--   practitioners -> active agents; staff -> all org agents; owner -> own.
-- ---------------------------------------------------------------------------
alter table public.ai_agents enable row level security;

-- PUBLIC READ: visibility='public' + active is genuinely public content.
create policy ai_agents_read_public on public.ai_agents
  for select
  using (visibility = 'public' and status = 'active');

-- MEMBER READ: organisation-visible agents readable by org members;
-- practitioners restricted to ACTIVE agents; staff read all org agents;
-- owners always read their own; super_admins read all.
create policy ai_agents_read_internal on public.ai_agents
  for select to authenticated
  using (
    app.is_super_admin()
    or owner_id = auth.uid()
    or (
      organisation_id = app.current_org_id()
      and (
        app.is_staff()                                   -- staff: all org agents
        or (app.current_role() = 'practitioner'          -- practitioner: active only
            and status = 'active')
        or (visibility = 'organisation'                  -- members: org-visible agents
            and status = 'active')
      )
    )
  );

-- WRITE: admins manage agents within their org; super_admin override.
create policy ai_agents_write on public.ai_agents
  for all to authenticated
  using (
    app.is_super_admin()
    or (organisation_id = app.current_org_id() and app.is_admin())
  )
  with check (
    app.is_super_admin()
    or (organisation_id = app.current_org_id() and app.is_admin())
  );


-- ---------------------------------------------------------------------------
-- ai_agent_versions  (APPEND-ONLY audit log)
--   Read: staff+ within the agent's org (or super_admin). Insert: admins.
--   NO update / delete policies -> immutable.
-- ---------------------------------------------------------------------------
alter table public.ai_agent_versions enable row level security;

create policy ai_agent_versions_read on public.ai_agent_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.ai_agents a
      where a.id = ai_agent_versions.agent_id
        and (
          app.is_super_admin()
          or (a.organisation_id = app.current_org_id() and app.is_staff())
        )
    )
  );

create policy ai_agent_versions_insert on public.ai_agent_versions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.ai_agents a
      where a.id = ai_agent_versions.agent_id
        and (
          app.is_super_admin()
          or (a.organisation_id = app.current_org_id() and app.is_admin())
        )
    )
  );
-- (Intentionally no UPDATE or DELETE policy: version history is immutable.)


-- ---------------------------------------------------------------------------
-- ai_agent_tools  (permissions derive from the parent agent)
-- ---------------------------------------------------------------------------
alter table public.ai_agent_tools enable row level security;

-- READ: whoever may read the agent may see its tool attachments (staff+/super).
create policy ai_agent_tools_read on public.ai_agent_tools
  for select to authenticated
  using (
    exists (
      select 1 from public.ai_agents a
      where a.id = ai_agent_tools.agent_id
        and (
          app.is_super_admin()
          or (a.organisation_id = app.current_org_id() and app.is_staff())
        )
    )
  );

-- WRITE: admins within the agent's org (super_admin override).
create policy ai_agent_tools_write on public.ai_agent_tools
  for all to authenticated
  using (
    exists (
      select 1 from public.ai_agents a
      where a.id = ai_agent_tools.agent_id
        and (
          app.is_super_admin()
          or (a.organisation_id = app.current_org_id() and app.is_admin())
        )
    )
  )
  with check (
    exists (
      select 1 from public.ai_agents a
      where a.id = ai_agent_tools.agent_id
        and (
          app.is_super_admin()
          or (a.organisation_id = app.current_org_id() and app.is_admin())
        )
    )
  );


-- ---------------------------------------------------------------------------
-- ai_agent_knowledge_sources  (permissions derive from the parent agent)
-- ---------------------------------------------------------------------------
alter table public.ai_agent_knowledge_sources enable row level security;

create policy ai_agent_knowledge_sources_read on public.ai_agent_knowledge_sources
  for select to authenticated
  using (
    exists (
      select 1 from public.ai_agents a
      where a.id = ai_agent_knowledge_sources.agent_id
        and (
          app.is_super_admin()
          or (a.organisation_id = app.current_org_id() and app.is_staff())
        )
    )
  );

create policy ai_agent_knowledge_sources_write on public.ai_agent_knowledge_sources
  for all to authenticated
  using (
    exists (
      select 1 from public.ai_agents a
      where a.id = ai_agent_knowledge_sources.agent_id
        and (
          app.is_super_admin()
          or (a.organisation_id = app.current_org_id() and app.is_admin())
        )
    )
  )
  with check (
    exists (
      select 1 from public.ai_agents a
      where a.id = ai_agent_knowledge_sources.agent_id
        and (
          app.is_super_admin()
          or (a.organisation_id = app.current_org_id() and app.is_admin())
        )
    )
  );


-- ---------------------------------------------------------------------------
-- ai_configurations
-- ---------------------------------------------------------------------------
alter table public.ai_configurations enable row level security;

-- READ: staff+ see their org config; all authenticated see global defaults;
-- super_admins see everything.
create policy ai_configurations_read on public.ai_configurations
  for select to authenticated
  using (
    app.is_super_admin()
    or organisation_id is null
    or (organisation_id = app.current_org_id() and app.is_staff())
  );

-- WRITE: admins manage their org config; super_admins manage global defaults.
create policy ai_configurations_write on public.ai_configurations
  for all to authenticated
  using (
    (organisation_id is null and app.is_super_admin())
    or (organisation_id = app.current_org_id() and app.is_admin())
  )
  with check (
    (organisation_id is null and app.is_super_admin())
    or (organisation_id = app.current_org_id() and app.is_admin())
  );

-- ============================================================================
-- End 0009_ai_agents.sql
-- ============================================================================
