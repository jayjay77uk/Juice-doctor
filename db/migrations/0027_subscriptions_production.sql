-- 0027_subscriptions_production.sql
-- Productionise the plan-based subscription model the platform actually uses:
-- admin-configurable plans (scope: single/multiple/all specialists), customer
-- subscriptions granting specialist access, and manually-recorded payments (no
-- live payment provider is configured — payments stay manual records by design).
-- Additive + idempotent; the earlier specialist_subscriptions table is untouched.

create table if not exists public.subscription_plans (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  name             text not null,
  description      text not null default '',
  scope            text not null default 'single', -- single | multiple | all
  specialist_slugs text[] not null default '{}',
  price_label      text not null default 'Price on request',
  status           text not null default 'active', -- active | archived
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists subscription_plans_org_idx on public.subscription_plans (organisation_id, status);

create table if not exists public.customer_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  member_id        uuid references auth.users (id) on delete set null,
  customer_name    text not null,
  customer_email   citext not null,
  plan_id          uuid references public.subscription_plans (id) on delete set null,
  plan_name        text not null,
  scope            text not null default 'single',
  specialist_slugs text[] not null default '{}',
  state            text not null default 'active', -- trialing|active|past_due|canceled|incomplete|suspended
  started_at       date,
  last_payment_at  date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists customer_subscriptions_org_idx on public.customer_subscriptions (organisation_id, state);
create index if not exists customer_subscriptions_member_idx on public.customer_subscriptions (member_id);

create table if not exists public.subscription_payments (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.customer_subscriptions (id) on delete cascade,
  note            text not null,
  recorded_by     uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists subscription_payments_sub_idx on public.subscription_payments (subscription_id, created_at desc);

-- RLS: members read their own subscriptions; staff read all (writes go through
-- the service-role server layer, same as the rest of the platform).
alter table public.subscription_plans enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'subscription_plans' and policyname = 'plans_staff_read') then
    create policy plans_staff_read on public.subscription_plans for select using (app.is_staff());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'customer_subscriptions' and policyname = 'subs_self_read') then
    create policy subs_self_read on public.customer_subscriptions for select using (member_id = auth.uid() or app.is_staff());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'subscription_payments' and policyname = 'payments_staff_read') then
    create policy payments_staff_read on public.subscription_payments for select using (app.is_staff());
  end if;
end $$;
