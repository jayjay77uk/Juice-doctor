-- ============================================================================
-- Migration: 0008_commerce.sql
-- Domain:    Commerce (programmes, enrollments, subscription plans, billing)
-- Platform:  Ask Juice Doctor AI
--
-- PURPOSE
--   Models the commercial surface of the platform: the catalogue of coaching
--   PROGRAMMES an organisation offers, member ENROLLMENTS into those
--   programmes, recurring subscription PLANS + SUBSCRIPTIONS, and the financial
--   record of PAYMENTS and INVOICES.
--
-- KEY MODELLING DECISIONS
--   1. NO real payment processor is wired here. Every money-moving table simply
--      records the *provider* (e.g. 'stripe') and a nullable *provider_*_id*
--      that a server-side webhook would later populate. This keeps the schema
--      provider-agnostic and lets the prototype run with placeholder data.
--   2. All amounts are stored as INTEGER MINOR UNITS (pence for GBP) to avoid
--      floating-point rounding on money. `currency` is a fixed 3-char ISO code.
--   3. PROGRAMMES supersede the Phase-1 flat design: they are now tenant-scoped
--      (organisation_id) and flow through the shared `publish_status` workflow
--      so drafts stay private and only 'published' rows are world-readable.
--   4. RLS: the ONLY public read anywhere in this file is published programmes.
--      Enrollments are member-owned; financial data (payments/invoices/
--      subscriptions) is visible strictly to the owning member and admins.
--   5. Financial rows are effectively append-only from the client's point of
--      view — clients get NO insert/update/delete on payments/invoices; those
--      are written server-side (service role) from verified provider webhooks.
--
-- CONVENTIONS (see migrations 0001–0005)
--   * PKs: id uuid default gen_random_uuid().
--   * Timestamps: created_at (+ updated_at & app.set_updated_at() trigger on
--     mutable tables).
--   * Tenancy: organisation_id -> public.organisations (cascade).
--   * Users: member_id / owner_id -> auth.users (cascade).
--   * RLS helpers: app.is_staff(), app.is_admin(), app.is_super_admin(),
--     app.current_org_id().
-- ============================================================================


-- ----------------------------------------------------------------------------
-- ENUMS (namespaced by the commerce domain they belong to)
-- ----------------------------------------------------------------------------

-- Delivery model of a programme.
create type public.programme_format as enum (
  'one_to_one',   -- 1:1 coaching
  'group',        -- cohort / group coaching
  'corporate',    -- organisation / B2B engagement
  'self_paced'    -- on-demand, no live component
);

-- Lifecycle of a member's enrollment in a programme.
create type public.enrollment_status as enum (
  'active',
  'completed',
  'paused',
  'cancelled'
);

-- Billing cadence for a subscription plan.
create type public.billing_interval as enum (
  'month',
  'year',
  'one_time'
);

-- Provider-aligned subscription lifecycle (mirrors common PSP states).
create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete'
);

-- Terminal + in-flight states of a single payment.
create type public.payment_status as enum (
  'pending',
  'succeeded',
  'failed',
  'refunded'
);

-- Provider-aligned invoice lifecycle.
create type public.invoice_status as enum (
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible'
);


-- ============================================================================
-- TABLE: programmes
--   The catalogue of coaching programmes an organisation offers. Tenant-scoped
--   and published through the shared publish_status workflow.
-- ============================================================================
create table public.programmes (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,

  slug             citext not null,                       -- URL-safe, case-insensitive
  title            text not null,
  summary          text,                                  -- short marketing blurb
  description      text,                                  -- long-form body

  format           public.programme_format not null,
  duration_label   text,                                  -- e.g. "6 weeks", "3 months"

  -- Human-facing price string ("From £499") kept alongside the machine amount
  -- so marketing copy and billing logic stay independent.
  price_label      text,
  price_amount     integer,                               -- minor units; null = "enquire"
  currency         char(3) not null default 'GBP',

  includes         text[] not null default '{}',          -- bullet list of what's included
  pillars          text[] not null default '{}',          -- juice/health pillars covered

  publish_status   public.publish_status not null default 'draft',
  featured         boolean not null default false,
  image_path       text,                                  -- storage path to hero image
  sort_order       integer not null default 0,            -- manual ordering in listings

  owner_id         uuid references auth.users (id) on delete set null,  -- authoring practitioner

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint programmes_org_slug_key unique (organisation_id, slug),
  constraint programmes_price_amount_nonneg check (price_amount is null or price_amount >= 0)
);

comment on table public.programmes is
  'Tenant-scoped catalogue of coaching programmes; published rows (publish_status=''published'') are world-readable, all other rows are org-internal.';

create index programmes_organisation_id_idx on public.programmes (organisation_id);
create index programmes_owner_id_idx         on public.programmes (owner_id);
create index programmes_publish_status_idx   on public.programmes (publish_status);
-- Fast path for the public listing: published rows ordered for display.
create index programmes_published_listing_idx
  on public.programmes (organisation_id, sort_order, created_at desc)
  where publish_status = 'published';
create index programmes_featured_idx
  on public.programmes (organisation_id)
  where featured;

create trigger set_updated_at before update on public.programmes
  for each row execute function app.set_updated_at();


-- ============================================================================
-- TABLE: programme_enrollments
--   A member's participation in a programme. Personal data owned by the member.
-- ============================================================================
create table public.programme_enrollments (
  id               uuid primary key default gen_random_uuid(),
  programme_id     uuid not null references public.programmes (id) on delete cascade,
  member_id        uuid not null references auth.users (id) on delete cascade,
  organisation_id  uuid not null references public.organisations (id) on delete cascade,

  status           public.enrollment_status not null default 'active',
  progress         integer not null default 0,            -- 0–100 percent complete
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- One live enrollment per member per programme.
  constraint programme_enrollments_member_programme_key unique (programme_id, member_id),
  constraint programme_enrollments_progress_range check (progress between 0 and 100)
);

comment on table public.programme_enrollments is
  'Member enrollments into programmes; personal data owned by the member with care-team (staff) read + admin management within the org.';

create index programme_enrollments_programme_id_idx    on public.programme_enrollments (programme_id);
create index programme_enrollments_member_id_idx       on public.programme_enrollments (member_id);
create index programme_enrollments_organisation_id_idx on public.programme_enrollments (organisation_id);
create index programme_enrollments_status_idx          on public.programme_enrollments (status);

create trigger set_updated_at before update on public.programme_enrollments
  for each row execute function app.set_updated_at();


-- ============================================================================
-- TABLE: plans
--   Definable subscription plans (pricing tiers) an organisation sells.
-- ============================================================================
create table public.plans (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,

  name             text not null,
  slug             citext not null,

  interval         public.billing_interval not null,
  price_amount     integer not null,                      -- minor units
  currency         char(3) not null default 'GBP',
  features         jsonb not null default '[]'::jsonb,    -- structured feature list

  status           public.record_status not null default 'draft',

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint plans_org_slug_key unique (organisation_id, slug),
  constraint plans_price_amount_nonneg check (price_amount >= 0)
);

comment on table public.plans is
  'Subscription pricing tiers offered by an organisation; active plans are readable within the org, managed by staff/admins.';

create index plans_organisation_id_idx on public.plans (organisation_id);
create index plans_status_idx          on public.plans (status);

create trigger set_updated_at before update on public.plans
  for each row execute function app.set_updated_at();


-- ============================================================================
-- TABLE: subscriptions
--   A member's active/inactive subscription to a plan. Financial data.
-- ============================================================================
create table public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  member_id                 uuid not null references auth.users (id) on delete cascade,
  plan_id                   uuid not null references public.plans (id) on delete restrict,
  organisation_id           uuid not null references public.organisations (id) on delete cascade,

  status                    public.subscription_status not null default 'incomplete',
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at                 timestamptz,                  -- scheduled cancellation, if any

  provider                  text not null default 'stripe',   -- PSP identifier
  provider_subscription_id  text,                             -- populated by webhook

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  -- Idempotency: a given provider subscription maps to at most one row.
  constraint subscriptions_provider_ref_key unique (provider, provider_subscription_id)
);

comment on table public.subscriptions is
  'Member subscriptions to plans (financial data); readable only by the owning member and admins, written server-side from provider webhooks.';

create index subscriptions_member_id_idx       on public.subscriptions (member_id);
create index subscriptions_plan_id_idx         on public.subscriptions (plan_id);
create index subscriptions_organisation_id_idx on public.subscriptions (organisation_id);
create index subscriptions_status_idx          on public.subscriptions (status);

create trigger set_updated_at before update on public.subscriptions
  for each row execute function app.set_updated_at();


-- ============================================================================
-- TABLE: payments
--   Immutable record of an individual payment attempt/settlement.
--   Append-only from the client's perspective (server-side writes only).
-- ============================================================================
create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references auth.users (id) on delete cascade,
  organisation_id      uuid not null references public.organisations (id) on delete cascade,
  subscription_id      uuid references public.subscriptions (id) on delete set null,

  amount               integer not null,                 -- minor units
  currency             char(3) not null default 'GBP',
  status               public.payment_status not null default 'pending',

  provider             text not null default 'stripe',
  provider_payment_id  text,                             -- populated by webhook
  description          text,

  created_at           timestamptz not null default now(),

  constraint payments_amount_nonneg check (amount >= 0),
  constraint payments_provider_ref_key unique (provider, provider_payment_id)
);

comment on table public.payments is
  'Append-only ledger of individual payments (financial data); readable only by the owning member and admins, inserted server-side from verified provider webhooks.';

create index payments_member_id_idx       on public.payments (member_id);
create index payments_organisation_id_idx on public.payments (organisation_id);
create index payments_subscription_id_idx on public.payments (subscription_id);
create index payments_status_idx          on public.payments (status);
create index payments_created_at_idx      on public.payments (created_at desc);


-- ============================================================================
-- TABLE: invoices
--   Immutable billing document for a member. Append-only from the client side.
-- ============================================================================
create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references auth.users (id) on delete cascade,
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  subscription_id  uuid references public.subscriptions (id) on delete set null,

  number           text not null,                        -- human-facing invoice number
  amount           integer not null,                     -- minor units
  currency         char(3) not null default 'GBP',
  status           public.invoice_status not null default 'draft',

  issued_at        timestamptz,
  due_at           timestamptz,
  pdf_path         text,                                 -- storage path to rendered PDF

  created_at       timestamptz not null default now(),

  constraint invoices_amount_nonneg check (amount >= 0),
  -- Invoice numbers are unique per organisation.
  constraint invoices_org_number_key unique (organisation_id, number)
);

comment on table public.invoices is
  'Append-only billing documents (financial data); readable only by the owning member and admins, generated server-side.';

create index invoices_member_id_idx       on public.invoices (member_id);
create index invoices_organisation_id_idx on public.invoices (organisation_id);
create index invoices_subscription_id_idx on public.invoices (subscription_id);
create index invoices_status_idx          on public.invoices (status);
create index invoices_created_at_idx      on public.invoices (created_at desc);


-- ============================================================================
-- ROW LEVEL SECURITY
--   Enabled on EVERY table. Policies follow least privilege.
-- ============================================================================

alter table public.programmes            enable row level security;
alter table public.programme_enrollments enable row level security;
alter table public.plans                 enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.payments              enable row level security;
alter table public.invoices              enable row level security;


-- ----------------------------------------------------------------------------
-- programmes
--   PUBLIC read of published rows (the ONLY public read in this file).
--   Org staff see everything in their org; staff/admins manage.
-- ----------------------------------------------------------------------------

-- Anyone (including anon) may read published programmes.
create policy programmes_public_read_published
  on public.programmes for select
  using (publish_status = 'published');

-- Org staff may read every programme (incl. drafts) in their org; platform
-- super-admins may read all.
create policy programmes_staff_read_org
  on public.programmes for select
  using (
    (app.is_staff() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );

-- Staff may create programmes within their own org.
create policy programmes_staff_insert_org
  on public.programmes for insert
  with check (
    app.is_staff() and organisation_id = app.current_org_id()
  );

-- Staff may update programmes within their own org.
create policy programmes_staff_update_org
  on public.programmes for update
  using (
    app.is_staff() and organisation_id = app.current_org_id()
  )
  with check (
    app.is_staff() and organisation_id = app.current_org_id()
  );

-- Only admins may delete programmes, and only within their own org.
create policy programmes_admin_delete_org
  on public.programmes for delete
  using (
    app.is_admin() and organisation_id = app.current_org_id()
  );


-- ----------------------------------------------------------------------------
-- programme_enrollments
--   Member owns their own; care-team (staff) read; admins manage within org.
-- ----------------------------------------------------------------------------

-- Member reads their own enrollments; staff read within org for care delivery;
-- super-admins read all.
create policy programme_enrollments_read
  on public.programme_enrollments for select
  using (
    member_id = auth.uid()
    or (app.is_staff() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );

-- Member may enrol themselves; staff may enrol members within the org.
create policy programme_enrollments_insert
  on public.programme_enrollments for insert
  with check (
    (member_id = auth.uid() and organisation_id = app.current_org_id())
    or (app.is_staff() and organisation_id = app.current_org_id())
  );

-- Member may update their own (e.g. pause); staff may update within org.
create policy programme_enrollments_update
  on public.programme_enrollments for update
  using (
    member_id = auth.uid()
    or (app.is_staff() and organisation_id = app.current_org_id())
  )
  with check (
    member_id = auth.uid()
    or (app.is_staff() and organisation_id = app.current_org_id())
  );

-- Only admins may hard-delete enrollments within their org.
create policy programme_enrollments_admin_delete
  on public.programme_enrollments for delete
  using (
    app.is_admin() and organisation_id = app.current_org_id()
  );


-- ----------------------------------------------------------------------------
-- plans
--   Active plans readable within the org; staff/admins manage.
-- ----------------------------------------------------------------------------

-- Members read active plans in their org; staff read all plans (incl. drafts);
-- super-admins read all.
create policy plans_read_org
  on public.plans for select
  using (
    (status = 'active' and organisation_id = app.current_org_id())
    or (app.is_staff() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );

-- Staff may create plans within their org.
create policy plans_staff_insert_org
  on public.plans for insert
  with check (
    app.is_staff() and organisation_id = app.current_org_id()
  );

-- Staff may update plans within their org.
create policy plans_staff_update_org
  on public.plans for update
  using (
    app.is_staff() and organisation_id = app.current_org_id()
  )
  with check (
    app.is_staff() and organisation_id = app.current_org_id()
  );

-- Only admins may delete plans within their org.
create policy plans_admin_delete_org
  on public.plans for delete
  using (
    app.is_admin() and organisation_id = app.current_org_id()
  );


-- ----------------------------------------------------------------------------
-- subscriptions  (FINANCIAL DATA)
--   Owning member + admins read only. Writes are server-side (service role);
--   admins may additionally manage within their org.
-- ----------------------------------------------------------------------------

-- Member reads their own subscriptions; admins read within org; super-admins all.
create policy subscriptions_read
  on public.subscriptions for select
  using (
    member_id = auth.uid()
    or (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );

-- Admins may correct/manage subscriptions within their org (day-to-day rows are
-- written by the service role, which bypasses RLS).
create policy subscriptions_admin_insert_org
  on public.subscriptions for insert
  with check (
    app.is_admin() and organisation_id = app.current_org_id()
  );

create policy subscriptions_admin_update_org
  on public.subscriptions for update
  using (
    app.is_admin() and organisation_id = app.current_org_id()
  )
  with check (
    app.is_admin() and organisation_id = app.current_org_id()
  );

create policy subscriptions_admin_delete_org
  on public.subscriptions for delete
  using (
    app.is_admin() and organisation_id = app.current_org_id()
  );


-- ----------------------------------------------------------------------------
-- payments  (FINANCIAL DATA — append-only)
--   Owning member + admins read only. NO client insert/update/delete: rows are
--   written exclusively server-side (service role) from verified webhooks.
-- ----------------------------------------------------------------------------

create policy payments_read
  on public.payments for select
  using (
    member_id = auth.uid()
    or (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );
-- (Intentionally no insert/update/delete policies — see append-only rationale.)


-- ----------------------------------------------------------------------------
-- invoices  (FINANCIAL DATA — append-only)
--   Owning member + admins read only. NO client insert/update/delete: rows are
--   generated server-side (service role).
-- ----------------------------------------------------------------------------

create policy invoices_read
  on public.invoices for select
  using (
    member_id = auth.uid()
    or (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );
-- (Intentionally no insert/update/delete policies — see append-only rationale.)

-- ============================================================================
-- End of migration 0008_commerce.sql
-- ============================================================================
