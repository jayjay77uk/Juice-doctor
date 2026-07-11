-- ============================================================================
-- 0012 · Knowledge management: documents, categories, tags, versioning,
--        publishing/approval workflow, chunking + embedding placeholders
--
-- The knowledge base is what "Ask Juice Doctor AI" reasons over: curated,
-- organisation-authored source material (PDF/DOCX/TXT/CSV/URL/manual, plus
-- future OCR + audio transcripts) that will be chunked and embedded for
-- retrieval-augmented generation.
--
-- KEY MODELLING DECISIONS
--   • Ingestion is decoupled from retrieval. A `knowledge_documents` row is the
--     logical asset; the raw bytes live in Supabase Storage (source_uri /
--     storage_path). Retrieval-facing derivatives (chunks, embeddings) are
--     separate tables so re-chunking / re-embedding never rewrites the asset.
--   • Versioning is first-class. `knowledge_document_versions` keeps the full
--     history; `knowledge_documents.current_version` points at the live one.
--     Chunks + embeddings are stamped with the version they were derived from so
--     stale vectors are identifiable after an edit.
--   • Publishing uses the shared `publish_status` enum (draft → in_review →
--     approved → published / rejected / archived) and an APPEND-ONLY
--     `knowledge_workflow_events` ledger records every transition for audit.
--   • Access is layered: a coarse `visibility` (private/organisation/public) on
--     the document, PLUS optional fine-grained `knowledge_permissions` grants
--     (per role or per user, read/edit/approve) for exceptions to the default.
--   • EMBEDDINGS ARE PLACEHOLDERS. pgvector is not enabled in this phase, so
--     `knowledge_embeddings` stores only metadata + an external `vector_ref`.
--     The real `embedding vector(N)` column is added in Phase 3 (see the
--     prominent note on that table). This lets the whole pipeline be modelled,
--     seeded, and RLS-secured now without the extension.
-- ============================================================================

-- ── Enums (namespaced `knowledge_*`) ─────────────────────────────────────────

-- How the source material arrived / what it is. `ocr` and `audio_transcript`
-- are declared now so the future ingestion pipelines need no schema change.
create type knowledge_source_type as enum (
  'pdf', 'docx', 'txt', 'csv', 'markdown', 'url', 'manual', 'ocr', 'audio_transcript'
);

-- Retrieval-readiness in the AI's knowledge brain (NOT the editorial workflow, and
-- NOT "trained"). A document is uploaded → processing → indexed → available; or
-- failed / archived. Supports future images/audio/video/website ingestion too.
create type knowledge_index_state as enum (
  'uploaded', 'processing', 'indexed', 'available', 'failed', 'archived'
);

-- Coarse-grained document reach. Refined further by knowledge_permissions.
--   private      → owner + explicit grants + staff only
--   organisation → any authenticated member of the owning organisation
--   public       → world-readable ONCE published (marketing / public FAQ, etc.)
create type knowledge_visibility as enum ('private', 'organisation', 'public');

-- Capability granted by a fine-grained knowledge_permissions row.
create type knowledge_access as enum ('read', 'edit', 'approve');

-- ── Taxonomy: categories (hierarchical) + tags (flat) ────────────────────────

-- Categories organise documents into a per-organisation tree (self-referencing
-- parent_id). Deleting a parent re-parents children to NULL rather than cascading
-- so documents are never orphaned by a taxonomy reshuffle.
create table public.knowledge_categories (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  parent_id       uuid references public.knowledge_categories (id) on delete set null,
  slug            citext not null,
  name            text not null,
  description     text,
  sort_order      int not null default 0,
  status          record_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organisation_id, slug)
);
comment on table public.knowledge_categories is
  'Hierarchical, per-organisation taxonomy for knowledge documents. parent_id self-refs; SET NULL on parent delete keeps children.';

-- Flat, per-organisation tags. Many-to-many with documents via the join table.
create table public.knowledge_tags (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  slug            citext not null,
  name            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organisation_id, slug)
);
comment on table public.knowledge_tags is
  'Flat per-organisation tags for cross-cutting labelling of documents.';

-- ── Documents ────────────────────────────────────────────────────────────────

-- The logical knowledge asset. Raw content lives in Storage (source_uri) and/or
-- inline on a version row; this table holds identity, taxonomy, ownership, and
-- publishing state. `current_version` points at the live version row.
create table public.knowledge_documents (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  category_id     uuid references public.knowledge_categories (id) on delete set null,
  title           text not null,
  slug            citext not null,
  description     text,
  source_type     knowledge_source_type not null,
  -- Supabase Storage path (private bucket) or an external URL. NULL for pure
  -- inline `manual` documents whose body lives on the version row.
  source_uri      text,
  current_version int not null default 1,
  publish_status  publish_status not null default 'draft',
  -- Retrieval-readiness in the AI's knowledge brain, DISTINCT from publish_status.
  -- A document is never "trained"; it moves through these accurate ingestion states.
  index_state     knowledge_index_state not null default 'uploaded',
  visibility      knowledge_visibility not null default 'organisation',
  owner_id        uuid not null references auth.users (id) on delete cascade,
  approved_by     uuid references auth.users (id) on delete set null,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organisation_id, slug)
);
comment on table public.knowledge_documents is
  'A knowledge asset the AI can be grounded on. Holds identity, taxonomy, ownership and publishing state; bytes live in Storage / version rows.';
comment on column public.knowledge_documents.current_version is
  'Points at the live knowledge_document_versions.version row.';
comment on column public.knowledge_documents.visibility is
  'Coarse reach (private/organisation/public); refined by knowledge_permissions grants.';

-- Document ↔ tag many-to-many.
create table public.knowledge_document_tags (
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  tag_id      uuid not null references public.knowledge_tags (id) on delete cascade,
  primary key (document_id, tag_id)
);
comment on table public.knowledge_document_tags is
  'Join table: which tags are applied to which knowledge documents.';

-- Immutable-ish version history. A new row per edit; `content` holds the inline
-- body for manual docs, `storage_path` points at the versioned file for uploads.
create table public.knowledge_document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.knowledge_documents (id) on delete cascade,
  version      int not null,
  title        text not null,
  content      text,
  storage_path text,
  change_note  text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (document_id, version)
);
comment on table public.knowledge_document_versions is
  'Full version history of a document. current_version on the parent selects the live one.';

-- ── Retrieval layer: chunks + embeddings ─────────────────────────────────────

-- Chunked text ready for retrieval. Stamped with the source `version` so chunks
-- from a superseded version can be pruned after a re-chunk. `metadata` carries
-- per-chunk hints (page/section/heading) without a schema change.
create table public.knowledge_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  version     int not null,
  chunk_index int not null,
  content     text not null,
  token_count int,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
comment on table public.knowledge_chunks is
  'Text chunks derived from a document version, ready for embedding + retrieval. version stamps them for staleness detection.';

-- Embedding METADATA per chunk.
--
-- ⚠️  PLACEHOLDER — NO VECTOR COLUMN YET.
-- pgvector is intentionally NOT enabled in this phase. When the `vector`
-- extension is turned on in Phase 3, this table gains the real payload column:
--
--       alter table public.knowledge_embeddings
--         add column embedding vector(1536);   -- N = `dimensions`
--       create index on public.knowledge_embeddings
--         using ivfflat (embedding vector_cosine_ops);   -- or hnsw
--
-- Until then, `vector_ref` may point at an external vector store (or stay NULL)
-- and this table exists purely to model the pipeline + hold model metadata so
-- nothing downstream needs re-architecting when embeddings go live.
create table public.knowledge_embeddings (
  id         uuid primary key default gen_random_uuid(),
  chunk_id   uuid not null references public.knowledge_chunks (id) on delete cascade,
  model_key  text not null,          -- e.g. 'text-embedding-3-small'
  dimensions int not null,           -- N for the future vector(N) column
  vector_ref text,                   -- external store id / URI; NULL until Phase 3
  created_at timestamptz not null default now()
);
comment on table public.knowledge_embeddings is
  'PLACEHOLDER for chunk embeddings. Metadata only — the real vector(N) column + ANN index are added in Phase 3 when pgvector is enabled (see file comment).';

-- ── Fine-grained access + workflow audit ─────────────────────────────────────

-- Exceptions to the coarse `visibility` model. A grant may target a document OR
-- a whole category, and apply to a role OR a specific user, conferring a given
-- access level. NULL document_id + set category_id = category-wide grant.
create table public.knowledge_permissions (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references public.knowledge_documents (id) on delete cascade,
  category_id uuid references public.knowledge_categories (id) on delete cascade,
  role        app_role,
  user_id     uuid references auth.users (id) on delete cascade,
  access      knowledge_access not null,
  created_at  timestamptz not null default now(),
  -- Must target exactly one subject dimension (a role OR a user) and at least
  -- one object dimension (a document OR a category).
  constraint knowledge_permissions_subject_ck
    check ((role is not null) <> (user_id is not null)),
  constraint knowledge_permissions_object_ck
    check (document_id is not null or category_id is not null)
);
comment on table public.knowledge_permissions is
  'Fine-grained read/edit/approve grants beyond visibility, per role or user, on a document or a whole category.';

-- Append-only publishing / approval ledger. One row per status transition, never
-- updated or deleted, so the approval chain is tamper-evident.
create table public.knowledge_workflow_events (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  from_status publish_status,
  to_status   publish_status not null,
  actor_id    uuid references auth.users (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);
comment on table public.knowledge_workflow_events is
  'Append-only audit of every publish_status transition on a document (draft→…→published). No update/delete.';

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index on public.knowledge_categories (organisation_id, status);
create index on public.knowledge_categories (parent_id);
create index on public.knowledge_tags (organisation_id);
create index on public.knowledge_documents (organisation_id, publish_status);
create index on public.knowledge_documents (organisation_id, visibility);
create index on public.knowledge_documents (category_id);
create index on public.knowledge_documents (owner_id);
create index on public.knowledge_document_tags (tag_id);
create index on public.knowledge_document_versions (document_id, version desc);
create index on public.knowledge_chunks (document_id, chunk_index);
create index on public.knowledge_embeddings (chunk_id);
create index on public.knowledge_embeddings (model_key);
create index on public.knowledge_permissions (document_id);
create index on public.knowledge_permissions (category_id);
create index on public.knowledge_permissions (user_id);
create index on public.knowledge_workflow_events (document_id, created_at desc);

-- ── updated_at triggers (mutable tables only) ────────────────────────────────
create trigger set_updated_at before update on public.knowledge_categories
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.knowledge_tags
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.knowledge_documents
  for each row execute function app.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.knowledge_categories        enable row level security;
alter table public.knowledge_tags              enable row level security;
alter table public.knowledge_documents         enable row level security;
alter table public.knowledge_document_tags     enable row level security;
alter table public.knowledge_document_versions enable row level security;
alter table public.knowledge_chunks            enable row level security;
alter table public.knowledge_embeddings        enable row level security;
alter table public.knowledge_permissions       enable row level security;
alter table public.knowledge_workflow_events   enable row level security;

-- Categories: readable within the org (or by super-admin); managed by anyone who
-- holds knowledge.edit or is an org admin.
create policy knowledge_categories_read on public.knowledge_categories
  for select using (organisation_id = app.current_org_id() or app.is_super_admin());
create policy knowledge_categories_write on public.knowledge_categories
  for all using (
    organisation_id = app.current_org_id()
    and (app.has_permission('knowledge.edit') or app.is_admin())
  )
  with check (
    organisation_id = app.current_org_id()
    and (app.has_permission('knowledge.edit') or app.is_admin())
  );

-- Tags: same posture as categories.
create policy knowledge_tags_read on public.knowledge_tags
  for select using (organisation_id = app.current_org_id() or app.is_super_admin());
create policy knowledge_tags_write on public.knowledge_tags
  for all using (
    organisation_id = app.current_org_id()
    and (app.has_permission('knowledge.edit') or app.is_admin())
  )
  with check (
    organisation_id = app.current_org_id()
    and (app.has_permission('knowledge.edit') or app.is_admin())
  );

-- ── Documents: the core read model ──────────────────────────────────────────
-- A document is READABLE when ANY of the following holds:
--   • it is PUBLISHED and visibility='public'                    → world-readable
--   • visibility='organisation' AND the reader is in the org
--   • the reader is the owner
--   • the reader has staff+ role within the org
--   • an explicit knowledge_permissions READ grant matches the reader
--     (matching user OR the reader's current role), on the document or its
--     category
create policy knowledge_documents_read on public.knowledge_documents
  for select using (
    (publish_status = 'published' and visibility = 'public')
    or (visibility = 'organisation' and organisation_id = app.current_org_id())
    or owner_id = auth.uid()
    or (organisation_id = app.current_org_id() and app.is_staff())
    or app.is_super_admin()
    or exists (
      select 1 from public.knowledge_permissions kp
      where kp.access = 'read'
        and (kp.document_id = knowledge_documents.id or kp.category_id = knowledge_documents.category_id)
        and (kp.user_id = auth.uid() or kp.role = app.current_role())
    )
  );

-- Editing is gated by the knowledge.edit permission (or org admin), scoped to the
-- org. Owners may always edit their own document.
create policy knowledge_documents_write on public.knowledge_documents
  for all using (
    organisation_id = app.current_org_id()
    and (owner_id = auth.uid() or app.has_permission('knowledge.edit') or app.is_admin())
  )
  with check (
    organisation_id = app.current_org_id()
    and (owner_id = auth.uid() or app.has_permission('knowledge.edit') or app.is_admin())
  );

-- Child rows inherit the parent document's readability. A single helper predicate
-- (does the caller pass knowledge_documents RLS for this document?) is expressed
-- by an EXISTS against the already-secured documents table.
create policy knowledge_document_tags_read on public.knowledge_document_tags
  for select using (
    exists (select 1 from public.knowledge_documents d where d.id = document_id)
  );
create policy knowledge_document_tags_write on public.knowledge_document_tags
  for all using (
    exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and d.organisation_id = app.current_org_id()
        and (d.owner_id = auth.uid() or app.has_permission('knowledge.edit') or app.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and d.organisation_id = app.current_org_id()
        and (d.owner_id = auth.uid() or app.has_permission('knowledge.edit') or app.is_admin())
    )
  );

-- Versions: readable if the parent document is; writable by editors of it.
create policy knowledge_document_versions_read on public.knowledge_document_versions
  for select using (
    exists (select 1 from public.knowledge_documents d where d.id = document_id)
  );
create policy knowledge_document_versions_write on public.knowledge_document_versions
  for all using (
    exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and d.organisation_id = app.current_org_id()
        and (d.owner_id = auth.uid() or app.has_permission('knowledge.edit') or app.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and d.organisation_id = app.current_org_id()
        and (d.owner_id = auth.uid() or app.has_permission('knowledge.edit') or app.is_admin())
    )
  );

-- Chunks + embeddings are retrieval derivatives: readable if the parent document
-- is readable; writes are server-side (ingestion pipeline) gated to editors so an
-- ordinary reader can never mutate the vector store's source of truth.
create policy knowledge_chunks_read on public.knowledge_chunks
  for select using (
    exists (select 1 from public.knowledge_documents d where d.id = document_id)
  );
create policy knowledge_chunks_write on public.knowledge_chunks
  for all using (
    exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and d.organisation_id = app.current_org_id()
        and (app.has_permission('knowledge.edit') or app.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id
        and d.organisation_id = app.current_org_id()
        and (app.has_permission('knowledge.edit') or app.is_admin())
    )
  );

create policy knowledge_embeddings_read on public.knowledge_embeddings
  for select using (
    exists (
      select 1 from public.knowledge_chunks c where c.id = chunk_id
    )
  );
create policy knowledge_embeddings_write on public.knowledge_embeddings
  for all using (
    exists (
      select 1
      from public.knowledge_chunks c
      join public.knowledge_documents d on d.id = c.document_id
      where c.id = chunk_id
        and d.organisation_id = app.current_org_id()
        and (app.has_permission('knowledge.edit') or app.is_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.knowledge_chunks c
      join public.knowledge_documents d on d.id = c.document_id
      where c.id = chunk_id
        and d.organisation_id = app.current_org_id()
        and (app.has_permission('knowledge.edit') or app.is_admin())
    )
  );

-- Permission grants: managed only by those who can approve knowledge (or admins);
-- a user may READ grants that reference them so they can see their own access.
create policy knowledge_permissions_read on public.knowledge_permissions
  for select using (
    user_id = auth.uid()
    or app.has_permission('knowledge.approve')
    or app.is_admin()
  );
create policy knowledge_permissions_write on public.knowledge_permissions
  for all using (app.has_permission('knowledge.approve') or app.is_admin())
  with check (app.has_permission('knowledge.approve') or app.is_admin());

-- Workflow events: APPEND-ONLY. No update/delete policy exists, so history cannot
-- be rewritten. Reads are for staff+ (audit visibility); inserts require the
-- approve permission (or admin) — transitions are performed server-side.
create policy knowledge_workflow_events_read on public.knowledge_workflow_events
  for select using (
    (app.is_staff() and exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id and d.organisation_id = app.current_org_id()
    ))
    or app.is_super_admin()
  );
create policy knowledge_workflow_events_insert on public.knowledge_workflow_events
  for insert with check (
    (app.has_permission('knowledge.approve') or app.is_admin())
    and exists (
      select 1 from public.knowledge_documents d
      where d.id = document_id and d.organisation_id = app.current_org_id()
    )
  );
