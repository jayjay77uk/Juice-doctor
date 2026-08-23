-- 0031_provider_readiness.sql
--
-- Storage for the provider-readiness development run: mail outbox, marketing
-- capture (contact + newsletter), instalment schedules, provider webhook
-- events, background-job runs and wearable token storage.
--
-- Additive + idempotent + forward-only. Every table is SERVICE-ROLE ONLY:
-- RLS is enabled with NO policies, so only the server (service role) can
-- touch them — none of this data is ever member-readable directly.
--
-- APPLIED to live Supabase (project qgthvvrygvtalkzkszsu) on 2026-08-23 and
-- verified: 8 tables present, RLS enabled, 0 policies, all unique constraints
-- in place; the production contact form now persists to contact_messages.
--
-- NOTE: until this migration is applied, the application degrades honestly —
-- mail reports undeliverable, the public contact/newsletter forms show a
-- truthful "not available yet" notice, instalment schedules report
-- unavailable, webhook events cannot be stored (and the endpoints answer 503
-- anyway while providers are unconnected), and job runs land in the audit log
-- only. Nothing is simulated in the meantime.

-- ============================================================================
-- Mail outbox — the durable record of every email the platform attempted.
-- ============================================================================
create table if not exists public.mail_outbox (
  id                   uuid primary key default gen_random_uuid(),
  to_address           citext not null,
  template             text not null,
  subject              text not null,
  body_text            text not null,
  body_html            text,
  status               text not null default 'queued'
                         check (status in ('queued', 'blocked', 'sent', 'failed')),
  provider             text,
  provider_message_id  text,
  error                text,
  attempts             integer not null default 0 check (attempts >= 0),
  dedupe_key           text,
  created_at           timestamptz not null default now(),
  sent_at              timestamptz
);

comment on table public.mail_outbox is
  'Every email the platform attempted or was blocked from sending. blocked = no provider configured (delivers on connection); dedupe_key makes enqueues idempotent.';

create unique index if not exists mail_outbox_dedupe_key_key on public.mail_outbox (dedupe_key) where dedupe_key is not null;
create index if not exists mail_outbox_status_created_idx on public.mail_outbox (status, created_at);

alter table public.mail_outbox enable row level security;

-- ============================================================================
-- Marketing capture — public contact messages + newsletter subscribers.
-- ============================================================================
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       citext not null,
  subject     text not null default '',
  message     text not null,
  status      text not null default 'new' check (status in ('new', 'seen', 'replied')),
  created_at  timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
alter table public.contact_messages enable row level security;

create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null unique,
  status      text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at  timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- ============================================================================
-- Instalment schedules — admin-entered amounts only; nothing auto-paid.
-- ============================================================================
create table if not exists public.payment_instalment_plans (
  id                        uuid primary key default gen_random_uuid(),
  organisation_id           uuid not null references public.organisations (id) on delete cascade,
  member_id                 uuid not null references auth.users (id) on delete cascade,
  customer_subscription_id  uuid references public.customer_subscriptions (id) on delete set null,
  description               text not null,
  currency                  char(3) not null default 'GBP',
  status                    text not null default 'active'
                              check (status in ('active', 'completed', 'cancelled')),
  created_at                timestamptz not null default now()
);

create index if not exists payment_instalment_plans_member_idx on public.payment_instalment_plans (member_id, created_at desc);
alter table public.payment_instalment_plans enable row level security;

create table if not exists public.payment_instalments (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references public.payment_instalment_plans (id) on delete cascade,
  sequence         integer not null check (sequence > 0),
  amount           integer not null check (amount > 0),          -- minor units
  due_date         date not null,
  status           text not null default 'pending'
                     check (status in ('pending', 'paid', 'cancelled')),
  paid_payment_id  uuid references public.payments (id) on delete set null,
  constraint payment_instalments_plan_seq_key unique (plan_id, sequence)
);

comment on table public.payment_instalments is
  'One agreed instalment. paid ONLY via an explicit admin action that records a real ledger payment (paid_payment_id) — never automatically.';

create index if not exists payment_instalments_due_idx on public.payment_instalments (status, due_date);
alter table public.payment_instalments enable row level security;

-- ============================================================================
-- Provider webhook events — the idempotency store for external events.
-- ============================================================================
create table if not exists public.provider_webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null,
  external_event_id  text not null,
  event_type         text not null,
  payload            jsonb not null default '{}'::jsonb,
  status             text not null default 'received'
                       check (status in ('received', 'processed', 'failed')),
  error              text,
  created_at         timestamptz not null default now(),
  constraint provider_webhook_events_provider_event_key unique (provider, external_event_id)
);

comment on table public.provider_webhook_events is
  'Insert-once store of verified provider webhook events (payments, wearables). The unique key guarantees a replayed event is acknowledged but never re-processed.';

create index if not exists provider_webhook_events_created_idx on public.provider_webhook_events (provider, created_at desc);
alter table public.provider_webhook_events enable row level security;

-- ============================================================================
-- Background-job runs — durable record of each /api/jobs/run invocation.
-- ============================================================================
create table if not exists public.job_runs (
  id           uuid primary key default gen_random_uuid(),
  started_at   timestamptz not null,
  finished_at  timestamptz not null,
  trigger      text not null default 'manual',
  results      jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists job_runs_created_idx on public.job_runs (created_at desc);
alter table public.job_runs enable row level security;

-- ============================================================================
-- Wearable provider tokens — ciphertext only, if the provider contract
-- requires persistent per-user tokens (see docs/integrations/thryve.md).
-- ============================================================================
create table if not exists public.wearable_provider_tokens (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  provider_key      text not null,
  token_ciphertext  text not null,
  created_at        timestamptz not null default now(),
  rotated_at        timestamptz,
  constraint wearable_provider_tokens_user_provider_key unique (user_id, provider_key)
);

comment on table public.wearable_provider_tokens is
  'Provider tokens are stored as ciphertext only — encrypted app-side with TOKEN_ENCRYPTION_KEY (introduced at the final connection stage). Plaintext secrets never live in this table.';

alter table public.wearable_provider_tokens enable row level security;
