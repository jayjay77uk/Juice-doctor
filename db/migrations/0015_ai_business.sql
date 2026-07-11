-- ============================================================================
-- 0015 · The AI business: receptionist routing, specialist products, CRM
--
-- Refocuses the platform from a generic AI builder onto the customer lifecycle:
-- Receptionist AI → Specialist AI subscription → AI-centric CRM. Extends the
-- existing agent model (no rebuild) and adds the CRM + subscription surface.
-- ============================================================================

set check_function_bodies = off;

-- An agent's role in the business.
create type agent_kind as enum ('receptionist', 'specialist', 'internal');

-- Extend the existing ai_agents (migration 0009) with a business identity.
alter table public.ai_agents
  add column if not exists kind agent_kind not null default 'specialist',
  -- Commercial identity for specialist products (tagline, expertise, price, accent).
  add column if not exists product jsonb;

comment on column public.ai_agents.kind is
  'receptionist (the single front door) | specialist (a subscription product) | internal (staff-only).';
comment on column public.ai_agents.product is
  'For kind=specialist: the subscription product identity (tagline, expertise[], priceLabel, priceAmount, interval, accent).';

-- ── AI-centric CRM ───────────────────────────────────────────────────────────
create type lead_status as enum ('new', 'qualified', 'recommended', 'subscribed', 'escalated', 'lost');
create type lead_follow_up as enum ('none', 'scheduled', 'in_progress', 'done');
create type lead_source as enum ('receptionist', 'website', 'referral', 'whatsapp');

create type lead_human_review as enum ('not_required', 'pending', 'approved', 'changed');
create type lead_whatsapp_status as enum ('none', 'requested', 'sent', 'connected');
create type lead_subscription_status as enum ('none', 'trial', 'active', 'canceled');

create table public.crm_leads (
  id                       uuid primary key default gen_random_uuid(),
  organisation_id          uuid not null references public.organisations (id) on delete cascade,
  user_id                  uuid references auth.users (id) on delete set null,
  name                     text not null,
  email                    citext not null,
  phone                    text,
  whatsapp                 text,
  source                   lead_source not null default 'receptionist',
  -- The complete receptionist ↔ visitor conversation.
  conversation             jsonb not null default '[]'::jsonb,
  -- The receptionist AI's structured consultation summary + answers.
  assessment_summary       text not null,
  assessment               jsonb not null default '{}'::jsonb,
  -- The recommendation, confidence and other possible matches considered.
  recommended_specialist   uuid references public.ai_agents (id) on delete set null,
  recommendation_confidence numeric not null default 0,
  alternative_matches      jsonb not null default '[]'::jsonb,
  -- Human review of an escalated/uncertain lead.
  human_review_status      lead_human_review not null default 'not_required',
  assigned_specialist      uuid references public.ai_agents (id) on delete set null,
  status                   lead_status not null default 'new',
  follow_up_status         lead_follow_up not null default 'none',
  whatsapp_status          lead_whatsapp_status not null default 'none',
  subscription_status      lead_subscription_status not null default 'none',
  progress                 int not null default 0,
  escalated                boolean not null default false,
  -- The escalation target (the client / an authorised team member). Configurable;
  -- the display name is held in system_settings (key 'receptionist.escalation_target').
  escalated_to             uuid references auth.users (id) on delete set null,
  -- The admin / team member responsible for this lead.
  responsible_admin        uuid references auth.users (id) on delete set null,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
comment on table public.crm_leads is
  'AI-centric CRM lead: the receptionist assessment, recommendation confidence, assigned specialist, follow-up and customer progress.';

create type lead_event_type as enum (
  'consultation', 'recommendation', 'lead_created', 'whatsapp_handoff', 'escalation', 'subscription', 'follow_up', 'note'
);

-- Append-only activity timeline for a lead.
create table public.crm_lead_events (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.crm_leads (id) on delete cascade,
  type        lead_event_type not null,
  title       text not null,
  detail      text,
  actor       text not null,
  created_at  timestamptz not null default now()
);
comment on table public.crm_lead_events is 'Append-only activity timeline per CRM lead.';

-- ── Specialist subscriptions ─────────────────────────────────────────────────
create type subscription_state as enum ('trialing', 'active', 'past_due', 'canceled');
-- Access scope: one specialist, several selected specialists, or all of them.
-- Final packages/pricing are NOT defined yet — this only keeps all three open.
create type subscription_scope as enum ('single', 'multiple', 'all');

create table public.specialist_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  -- Null for scope 'multiple'/'all'; set for 'single'.
  specialist_id   uuid references public.ai_agents (id) on delete cascade,
  scope           subscription_scope not null default 'single',
  user_id         uuid references auth.users (id) on delete set null,
  lead_id         uuid references public.crm_leads (id) on delete set null,
  customer_name   text not null,
  customer_email  citext not null,
  state           subscription_state not null default 'active',
  mrr_amount      int not null default 0,     -- minor units
  currency        char(3) not null default 'GBP',
  plan            text not null,
  started_at      timestamptz not null default now(),
  current_period_end timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.specialist_subscriptions is
  'Which customers subscribe to which specialist AI product, and the MRR it earns.';

create index on public.crm_leads (organisation_id, status, created_at desc);
create index on public.crm_leads (assigned_specialist);
create index on public.crm_lead_events (lead_id, created_at);
create index on public.specialist_subscriptions (specialist_id, state);
create index on public.ai_agents (organisation_id, kind);

create trigger set_updated_at before update on public.crm_leads
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.specialist_subscriptions
  for each row execute function app.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.crm_leads enable row level security;
alter table public.crm_lead_events enable row level security;
alter table public.specialist_subscriptions enable row level security;

-- Leads + subscriptions: staff read within org, admins manage. Inserts happen
-- server-side (the receptionist creates leads via SECURITY DEFINER code); a
-- customer may read their own subscription.
create policy leads_staff_read on public.crm_leads
  for select using (organisation_id = app.current_org_id() and app.is_staff());
create policy leads_admin_write on public.crm_leads
  for all using (organisation_id = app.current_org_id() and app.is_staff())
  with check (organisation_id = app.current_org_id() and app.is_staff());

-- Lead events: append-only (read for staff of the lead's org; no update/delete).
create policy lead_events_read on public.crm_lead_events
  for select using (exists (
    select 1 from public.crm_leads l
    where l.id = crm_lead_events.lead_id and l.organisation_id = app.current_org_id() and app.is_staff()));

create policy subs_read on public.specialist_subscriptions
  for select using (
    user_id = auth.uid()
    or (organisation_id = app.current_org_id() and app.is_staff())
  );
create policy subs_admin_write on public.specialist_subscriptions
  for all using (organisation_id = app.current_org_id() and app.is_admin())
  with check (organisation_id = app.current_org_id() and app.is_admin());
