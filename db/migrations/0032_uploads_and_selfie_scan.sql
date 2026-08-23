-- ============================================================================
-- 0032 · Secure uploads + provider-neutral Remote Selfie Scan lifecycle
--
-- No external provider is connected by this migration. It creates the durable
-- application-side state and private storage buckets needed before credentials
-- are supplied. Service-role server actions own all storage writes; private files
-- are exposed only through short-lived signed URLs after ownership checks.
-- ============================================================================

-- Private buckets are idempotent so this migration is safe on environments where
-- an operator provisioned one manually before the schema landed.
insert into storage.buckets (id, name, public, file_size_limit)
values ('knowledge', 'knowledge', false, 26214400)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

insert into storage.buckets (id, name, public, file_size_limit)
values ('conversation-attachments', 'conversation-attachments', false, 10485760)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- ── Conversation attachments ────────────────────────────────────────────────
create table if not exists public.conversation_attachments (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  uploaded_by      uuid not null references auth.users (id) on delete cascade,
  filename         text not null,
  mime_type        text not null,
  byte_size        bigint not null check (byte_size >= 0 and byte_size <= 10485760),
  storage_path     text not null unique,
  created_at       timestamptz not null default now()
);
comment on table public.conversation_attachments is
  'Private files attached to a member conversation. Files are not automatically fed into AI context; they are a secure shared conversation artifact.';

create index if not exists conversation_attachments_conversation_idx
  on public.conversation_attachments (conversation_id, created_at desc);

alter table public.conversation_attachments enable row level security;

drop policy if exists conversation_attachments_owner_read on public.conversation_attachments;
create policy conversation_attachments_owner_read on public.conversation_attachments
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_attachments.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists conversation_attachments_staff_read on public.conversation_attachments;
create policy conversation_attachments_staff_read on public.conversation_attachments
  for select using (
    organisation_id = app.current_org_id() and app.is_staff()
  );

-- Direct browser writes are intentionally absent. The authenticated server action
-- validates ownership, MIME/extension/magic bytes, writes storage with service
-- role, then records metadata atomically-with-cleanup at the application tier.

-- ── Remote Selfie Scan ──────────────────────────────────────────────────────
create table if not exists public.selfie_scan_sessions (
  id                    uuid primary key default gen_random_uuid(),
  organisation_id       uuid not null references public.organisations (id) on delete cascade,
  user_id               uuid not null references auth.users (id) on delete cascade,
  provider              text,
  provider_session_id   text,
  status                text not null default 'created'
    check (status in ('created','pending','in_progress','completed','failed','cancelled')),
  purpose               text not null default 'remote_selfie_scan',
  provider_metadata     jsonb not null default '{}'::jsonb,
  result_summary        jsonb not null default '{}'::jsonb,
  failure_code          text,
  started_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table public.selfie_scan_sessions is
  'Provider-neutral Remote Selfie Scan lifecycle. No provider contract or credentials are assumed; an adapter populates provider fields only once selected/configured.';

create index if not exists selfie_scan_sessions_user_idx
  on public.selfie_scan_sessions (user_id, created_at desc);
create unique index if not exists selfie_scan_provider_session_uq
  on public.selfie_scan_sessions (provider, provider_session_id)
  where provider is not null and provider_session_id is not null;

create trigger set_updated_at before update on public.selfie_scan_sessions
  for each row execute function app.set_updated_at();

alter table public.selfie_scan_sessions enable row level security;

drop policy if exists selfie_scan_owner_read on public.selfie_scan_sessions;
create policy selfie_scan_owner_read on public.selfie_scan_sessions
  for select using (user_id = auth.uid());

drop policy if exists selfie_scan_staff_read on public.selfie_scan_sessions;
create policy selfie_scan_staff_read on public.selfie_scan_sessions
  for select using (organisation_id = app.current_org_id() and app.is_staff());

-- Session creation/mutation is server-only: the application must establish a
-- signed provider session and verify callback/webhook authenticity before status
-- changes. No browser INSERT/UPDATE policy is granted.
