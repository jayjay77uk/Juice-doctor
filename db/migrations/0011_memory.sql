-- ============================================================================
-- 0011 · AI memory architecture
--
-- DOMAIN
--   The persistent memory substrate for "Ask Juice Doctor AI". Agents and the
--   platform need to remember things at very different lifetimes and blast radii:
--   a throwaway scratchpad for one browser session, durable facts about a user,
--   a running summary of one conversation, an agent's own operating instructions,
--   organisation-wide knowledge, and truly global platform facts. Each of these
--   is a distinct SECURITY boundary — a session note must never leak into another
--   user's context, and an org fact must never cross tenants.
--
-- KEY MODELLING DECISION — ONE TABLE, SIX SCOPES
--   Rather than six near-identical tables, we model a single `ai_memory` table
--   with a `scope` discriminator and a set of NULLABLE scope-key columns. Only
--   the key(s) relevant to a scope are populated; RLS then isolates each scope
--   using the appropriate key. This keeps the retrieval layer uniform (one query
--   shape, one embedding-ref convention, one importance/expiry model) while still
--   giving each scope its own least-privilege access rules.
--
--     scope         | identifying key column(s)          | who owns / sees it
--     --------------+------------------------------------+--------------------------
--     session       | session_id  (+ user_id)            | the signed-in user
--     user          | user_id                            | the user; staff may read
--     conversation  | conversation_id                    | owner of that conversation
--     agent         | agent_id                           | org admins write, staff read
--     organisation  | organisation_id                    | staff read, admins write
--     global        | (none — platform-wide)            | everyone reads, super-admin writes
--
--   `data` (jsonb) carries structured payloads; `content` carries the human/LLM
--   readable text. `kind='embedding_ref'` rows point (via `data`/`source`) at a
--   vector stored in the embeddings store rather than inlining the vector here —
--   pgvector columns live in their own table; this table only references them.
--
-- WHY the integrity choices
--   * conversation_id FKs `public.conversations ... on delete cascade`: when a
--     conversation is deleted its memory must go with it (no orphaned context).
--   * agent_id is a SOFT reference to `public.ai_agents` (no FK): agents may be
--     provisioned/deprovisioned out of band and we do not want memory writes to
--     hard-fail on agent lifecycle; integrity is enforced at the application tier.
--   * user_id / organisation_id cascade from their owners so deleting a user or
--     tenant removes their memory (GDPR / tenant-offboarding hygiene).
-- ============================================================================

-- ── Enums ────────────────────────────────────────────────────────────────────

-- The six isolation scopes. See the header table for the identifying key of each.
create type memory_scope as enum (
  'session',        -- ephemeral, keyed by session_id for one signed-in user
  'user',           -- durable per-user memory
  'conversation',   -- bound to a single conversation thread
  'agent',          -- an agent's own instructions / learned operating notes
  'organisation',   -- tenant-wide shared knowledge
  'global'          -- platform-wide facts, readable by all
);

-- What a memory row represents. Drives how the retrieval layer treats it.
create type memory_kind as enum (
  'fact',           -- an atomic asserted fact
  'summary',        -- a condensed rollup (e.g. conversation summary)
  'preference',     -- a stated/inferred preference
  'instruction',    -- a directive / system-style instruction for an agent
  'embedding_ref'   -- a pointer to a vector in the embeddings store (see `data`)
);

-- ── Table ────────────────────────────────────────────────────────────────────

create table public.ai_memory (
  id               uuid primary key default gen_random_uuid(),

  -- Scope discriminator + the nullable scope keys. Exactly the key(s) that
  -- identify a given scope should be set; the rest stay NULL. A CHECK enforces
  -- that the mandatory key for each scope is present (defence in depth alongside
  -- RLS, which relies on these keys to isolate rows).
  scope            memory_scope not null,

  -- Tenant key. Set for tenant-bound scopes; NULL for pure-global rows.
  organisation_id  uuid references public.organisations (id) on delete cascade,
  -- Owner key for user/session scopes.
  user_id          uuid references auth.users (id) on delete cascade,
  -- Soft reference to public.ai_agents (no FK — agent lifecycle is out of band).
  agent_id         uuid,
  -- Hard reference: conversation memory dies with its conversation.
  conversation_id  uuid references public.conversations (id) on delete cascade,
  -- Opaque client/session identifier for the 'session' scope.
  session_id       text,

  kind             memory_kind not null default 'fact',
  -- A stable dotted/namespaced key for upsert-style retrieval (e.g. 'allergy.peanut',
  -- 'pref.units', 'summary.latest'). Not globally unique — unique per scope owner.
  memory_key       text not null,
  content          text,
  data             jsonb not null default '{}'::jsonb,

  -- Retention/ranking signals. Higher importance survives context pruning; a
  -- non-null expires_at lets a sweeper drop stale/ephemeral rows.
  importance       int not null default 0,
  source           text,             -- provenance: 'user', 'agent:<id>', 'ingest', ...
  expires_at       timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Each scope must carry its identifying key. This both documents the model and
  -- prevents rows that RLS could not correctly isolate.
  constraint ai_memory_scope_key_present check (
    case scope
      when 'session'      then session_id is not null and user_id is not null
      when 'user'         then user_id is not null
      when 'conversation' then conversation_id is not null
      when 'agent'        then agent_id is not null and organisation_id is not null
      when 'organisation' then organisation_id is not null
      when 'global'       then true
    end
  )
);

comment on table public.ai_memory is
  'Unified AI memory store across six isolation scopes (session/user/conversation/agent/organisation/global). '
  'A `scope` discriminator plus nullable scope-key columns (session_id, user_id, conversation_id, agent_id, '
  'organisation_id) let each scope share structure while being isolated by RLS. `kind=embedding_ref` rows point '
  'at vectors in the embeddings store rather than inlining them.';

comment on column public.ai_memory.agent_id is
  'Soft reference to public.ai_agents (no FK): agent provisioning is out of band and must not hard-fail memory writes.';
comment on column public.ai_memory.memory_key is
  'Namespaced retrieval key, unique per scope owner (see the partial unique indexes), used for upsert-style reads.';
comment on column public.ai_memory.data is
  'Structured payload; for kind=embedding_ref this holds the vector locator (store id, dimension, model).';

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- Partial indexes per scope: they keep each scope's working set small and back
-- the exact lookups RLS + retrieval perform. Where a key naturally identifies a
-- single logical memory, the index is UNIQUE to give free upsert semantics.

-- user scope: fetch/upsert a user's memory by key.
create unique index ai_memory_user_key_uq on public.ai_memory (user_id, memory_key)
  where scope = 'user';

-- session scope: a session's notes by key (scoped within the owning user).
create unique index ai_memory_session_key_uq on public.ai_memory (session_id, memory_key)
  where scope = 'session';

-- conversation scope: pull all memory for a conversation, newest first.
create index ai_memory_conversation_idx on public.ai_memory (conversation_id, created_at desc)
  where scope = 'conversation';

-- agent scope: an agent's instructions by key, isolated per org.
create unique index ai_memory_agent_key_uq on public.ai_memory (agent_id, memory_key)
  where scope = 'agent';

-- organisation scope: tenant-wide memory by key.
create unique index ai_memory_org_key_uq on public.ai_memory (organisation_id, memory_key)
  where scope = 'organisation';

-- global scope: platform-wide memory by key.
create unique index ai_memory_global_key_uq on public.ai_memory (memory_key)
  where scope = 'global';

-- Retrieval ranking (importance-weighted) and the retention sweeper.
create index ai_memory_importance_idx on public.ai_memory (scope, importance desc, created_at desc);
create index ai_memory_expiry_idx on public.ai_memory (expires_at) where expires_at is not null;

-- ── updated_at trigger ───────────────────────────────────────────────────────
create trigger set_updated_at before update on public.ai_memory
  for each row execute function app.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- One combined policy set. Each command's predicate is an OR across the scopes,
-- so a row is visible/writable iff its scope's specific rule is satisfied. This
-- keeps every scope isolated by its own key while sharing one table. Least
-- privilege throughout: no scope grants blanket access, and `using(true)` appears
-- only for genuinely public GLOBAL reads.
alter table public.ai_memory enable row level security;

-- SELECT — who can READ each scope:
--   user          → the owner; org staff (clinically/operationally justified)
--   session       → the owner
--   conversation  → the owner of the parent conversation
--   agent         → org staff (read) within the same tenant
--   organisation  → org staff within the same tenant
--   global        → everyone
create policy ai_memory_read on public.ai_memory
  for select using (
    (scope = 'user'
       and (user_id = auth.uid()
            or (organisation_id = app.current_org_id() and app.is_staff())))
    or (scope = 'session'
       and user_id = auth.uid())
    or (scope = 'conversation'
       and exists (
         select 1 from public.conversations c
         where c.id = ai_memory.conversation_id
           and c.user_id = auth.uid()))
    or (scope = 'agent'
       and organisation_id = app.current_org_id() and app.is_staff())
    or (scope = 'organisation'
       and organisation_id = app.current_org_id() and app.is_staff())
    or (scope = 'global')
    or app.is_super_admin()
  );

-- INSERT — who can CREATE each scope (WITH CHECK guards the new row's scope+keys):
--   user / session → only for oneself
--   conversation   → only into a conversation you own
--   agent          → org admins, within their tenant
--   organisation   → org admins, within their tenant
--   global         → super-admin only
create policy ai_memory_insert on public.ai_memory
  for insert with check (
    (scope = 'user'
       and user_id = auth.uid())
    or (scope = 'session'
       and user_id = auth.uid())
    or (scope = 'conversation'
       and exists (
         select 1 from public.conversations c
         where c.id = ai_memory.conversation_id
           and c.user_id = auth.uid()))
    or (scope = 'agent'
       and organisation_id = app.current_org_id() and app.is_admin())
    or (scope = 'organisation'
       and organisation_id = app.current_org_id() and app.is_admin())
    or (scope = 'global' and app.is_super_admin())
    or app.is_super_admin()
  );

-- UPDATE — who can MODIFY each scope. USING gates the existing row; WITH CHECK
-- re-validates the post-image so a row cannot be re-scoped out from under RLS.
--   user / session → the owner
--   conversation   → the conversation owner
--   agent / org    → org admins within their tenant
--   global         → super-admin only
create policy ai_memory_update on public.ai_memory
  for update using (
    (scope = 'user'        and user_id = auth.uid())
    or (scope = 'session'     and user_id = auth.uid())
    or (scope = 'conversation'
       and exists (
         select 1 from public.conversations c
         where c.id = ai_memory.conversation_id
           and c.user_id = auth.uid()))
    or (scope = 'agent'
       and organisation_id = app.current_org_id() and app.is_admin())
    or (scope = 'organisation'
       and organisation_id = app.current_org_id() and app.is_admin())
    or (scope = 'global' and app.is_super_admin())
    or app.is_super_admin()
  ) with check (
    (scope = 'user'        and user_id = auth.uid())
    or (scope = 'session'     and user_id = auth.uid())
    or (scope = 'conversation'
       and exists (
         select 1 from public.conversations c
         where c.id = ai_memory.conversation_id
           and c.user_id = auth.uid()))
    or (scope = 'agent'
       and organisation_id = app.current_org_id() and app.is_admin())
    or (scope = 'organisation'
       and organisation_id = app.current_org_id() and app.is_admin())
    or (scope = 'global' and app.is_super_admin())
    or app.is_super_admin()
  );

-- DELETE — mirrors UPDATE authority for each scope (owner for personal scopes,
-- org admins for tenant scopes, super-admin for global).
create policy ai_memory_delete on public.ai_memory
  for delete using (
    (scope = 'user'        and user_id = auth.uid())
    or (scope = 'session'     and user_id = auth.uid())
    or (scope = 'conversation'
       and exists (
         select 1 from public.conversations c
         where c.id = ai_memory.conversation_id
           and c.user_id = auth.uid()))
    or (scope = 'agent'
       and organisation_id = app.current_org_id() and app.is_admin())
    or (scope = 'organisation'
       and organisation_id = app.current_org_id() and app.is_admin())
    or (scope = 'global' and app.is_super_admin())
    or app.is_super_admin()
  );
