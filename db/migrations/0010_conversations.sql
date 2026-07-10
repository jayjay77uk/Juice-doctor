-- ============================================================================
-- 0010 · Conversations, messages & message feedback
--
-- The persistence layer for "Ask Juice Doctor AI" chat. This migration models
-- ONLY the durable structure of a conversation — the transcript and its human
-- feedback signals. It deliberately contains NO AI runtime: no queues, no
-- streaming state, no provider credentials. Inference happens server-side; this
-- schema is where the resulting turns are written and read back.
--
-- KEY MODELLING DECISIONS
--   • Two levels, not one. `conversations` is the durable thread a user owns;
--     `messages` are its immutable turns. Splitting them keeps thread metadata
--     (title, status, last_message_at) cheap to list without scanning every turn.
--   • A conversation is OWNED BY A HUMAN (user_id → auth.users). The AI agent is
--     a *soft* reference (agent_id, no FK) — agents live in a separate domain
--     (public.ai_agents, migration 0008) that may be versioned, swapped, or
--     deleted independently without cascading away a user's chat history.
--   • Messages are append-only by design. There is no updated_at and no update/
--     delete RLS policy: an LLM transcript is an audit-relevant record. Editing a
--     turn would corrupt the conversation's meaning and any downstream training/
--     evaluation signal. Corrections are new turns, not mutations.
--   • message_feedback is separated from messages so a 👍/👎 (and free-text note)
--     is attributable to a specific user and carries its own lifecycle, rather
--     than overloading the message row. One vote per (message, user).
--   • Tenancy + ownership together: conversations carry organisation_id (support
--     staff read within their org) AND user_id (the owner). Messages inherit both
--     via their parent conversation, checked with EXISTS to avoid duplicating the
--     columns and keep the ownership rule in exactly one place.
--
-- Depends on: 0001 (enums, app.* helpers, set_updated_at), 0002 (organisations).
-- Soft-references: public.ai_agents (0008). Dialect: PostgreSQL 15+ / Supabase.
-- ============================================================================

-- ── Enums (namespaced to this domain) ───────────────────────────────────────

-- Lifecycle of a conversation thread. 'deleted' is a soft-delete tombstone: the
-- row is hidden from normal reads but retained so message history/audit survives
-- until a hard purge job removes it.
create type conversation_status as enum ('active', 'archived', 'deleted');

-- Author role of a single message turn, mirroring the OpenAI/Anthropic chat
-- roles so transcripts map 1:1 onto a provider request without translation:
--   • system    — instruction/context turn that primes the assistant
--   • user      — the human participant's turn
--   • assistant — the model's reply
--   • tool      — the result of a tool/function invocation fed back to the model
create type message_role as enum ('system', 'user', 'assistant', 'tool');

-- Coarse thumbs signal a user attaches to an assistant message.
create type feedback_rating as enum ('up', 'down');

-- ── conversations ───────────────────────────────────────────────────────────
-- A durable chat thread between one human and one AI agent, scoped to a tenant.
create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  -- The human participant who owns this thread. Cascades so a deleted user's
  -- conversations (and, via 0010's cascade below, their messages) are removed.
  user_id          uuid not null references auth.users (id) on delete cascade,
  -- Soft reference to public.ai_agents (migration 0008). Intentionally NOT a
  -- foreign key: agents are versioned/replaceable and must be able to change or
  -- be retired without deleting a user's conversation history. Nullable because
  -- a thread may be created before an agent is bound (or the agent since removed).
  agent_id         uuid,
  title            text,
  status           conversation_status not null default 'active',
  -- Free-form thread context (locale, entry point, feature flags, retrieved
  -- profile snippets, …). Extended without a migration.
  context          jsonb not null default '{}'::jsonb,
  -- Denormalised timestamp of the newest message, maintained server-side, so the
  -- conversation list sorts by recency without joining/aggregating messages.
  last_message_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.conversations is
  'A durable chat thread owned by one human (user_id) with one AI agent (agent_id, soft ref to public.ai_agents), scoped to an organisation.';

-- ── messages ────────────────────────────────────────────────────────────────
-- One immutable turn in a conversation. Append-only: never updated or deleted.
create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  role             message_role not null,
  content          text not null,
  -- Provider-reported token usage for this turn, for cost accounting/analytics.
  token_count      int,
  -- For assistant turns that call tools: the array of tool/function invocations
  -- requested by the model (name + arguments), verbatim from the provider.
  tool_calls       jsonb,
  -- For role = 'tool': the id of the tool call this message answers, linking a
  -- tool result back to the assistant tool_calls entry that requested it.
  tool_call_id     text,
  -- The model that produced this turn (e.g. 'claude-opus-4-8'), captured so the
  -- transcript stays interpretable even after the agent's default model changes.
  model_key        text,
  created_at       timestamptz not null default now()
);
comment on table public.messages is
  'Append-only turns of a conversation (system/user/assistant/tool). Never mutated: an LLM transcript is an audit record.';

-- Primary read path: fetch a conversation''s turns in chronological order.
create index on public.messages (conversation_id, created_at);

-- ── message_feedback ────────────────────────────────────────────────────────
-- A user's thumbs-up/down (plus optional note) on a single message.
create table public.message_feedback (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references public.messages (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  rating       feedback_rating not null,
  comment      text,
  created_at   timestamptz not null default now(),
  -- One vote per user per message; re-rating replaces via upsert on this key.
  unique (message_id, user_id)
);
comment on table public.message_feedback is
  'Per-user thumbs (up/down) and optional note on a message. One vote per (message, user).';

-- Aggregate feedback for a message (e.g. counting downvotes) without a scan.
create index on public.message_feedback (message_id);

-- ── Triggers ────────────────────────────────────────────────────────────────
-- Only conversations is mutable (title/status/last_message_at change); messages
-- and message_feedback are append-only and carry no updated_at.
create trigger set_updated_at before update on public.conversations
  for each row execute function app.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_feedback enable row level security;

-- Conversations: a user fully manages their OWN threads. Staff may READ within
-- their organisation to provide support, but never write to a user's thread.
create policy conversation_owner_all on public.conversations
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy conversation_staff_read on public.conversations
  for select
  using (organisation_id = app.current_org_id() and app.is_staff());

-- Messages: authorised via the PARENT conversation's ownership (single source of
-- truth). A user may read/append messages on a conversation they own; support
-- staff may read messages in conversations within their org. Append-only — no
-- update or delete policy exists, so transcripts cannot be rewritten.
create policy message_owner_read on public.messages
  for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy message_owner_insert on public.messages
  for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy message_staff_read on public.messages
  for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.organisation_id = app.current_org_id()
        and app.is_staff()
    )
  );

-- Message feedback: owned by the user who gave it. Only the owner reads/writes
-- their vote; a user may only rate a message that belongs to a conversation they
-- own (they cannot rate messages in someone else's thread). Staff may READ
-- feedback within their org to triage quality signals.
create policy feedback_owner_all on public.message_feedback
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_feedback.message_id
        and c.user_id = auth.uid()
    )
  );

create policy feedback_staff_read on public.message_feedback
  for select
  using (
    exists (
      select 1
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_feedback.message_id
        and c.organisation_id = app.current_org_id()
        and app.is_staff()
    )
  );
