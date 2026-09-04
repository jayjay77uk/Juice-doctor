-- Reconcile the AI specialist subscription repository with the live database schema.
-- This is additive and intentionally keeps the existing marketplace subscription_plans rows.
create extension if not exists citext;
alter table public.subscription_plans add column if not exists scope text not null default 'all';
alter table public.subscription_plans add column if not exists specialist_slugs text[] not null default '{}';
alter table public.subscription_plans add column if not exists price_label text not null default 'Price on request';
alter table public.subscription_plans add column if not exists status text not null default 'active';
create table if not exists public.customer_subscriptions (
 id uuid primary key default gen_random_uuid(), member_id uuid references auth.users(id) on delete set null,
 customer_name text not null, customer_email citext not null, plan_id uuid references public.subscription_plans(id) on delete set null,
 plan_name text not null, scope text not null default 'all', specialist_slugs text[] not null default '{}', state text not null default 'active',
 started_at date, last_payment_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists customer_subscriptions_member_idx on public.customer_subscriptions(member_id);
create table if not exists public.subscription_payments (
 id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.customer_subscriptions(id) on delete cascade,
 note text not null, recorded_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists subscription_payments_sub_idx on public.subscription_payments(subscription_id,created_at desc);
alter table public.subscription_plans enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where tablename='subscription_plans' and policyname='plans_authenticated_read') then create policy plans_authenticated_read on public.subscription_plans for select to authenticated using (is_active=true and status='active'); end if;
 if not exists(select 1 from pg_policies where tablename='customer_subscriptions' and policyname='subs_self_read') then create policy subs_self_read on public.customer_subscriptions for select to authenticated using (member_id=auth.uid()); end if;
end $$;
insert into public.subscription_plans (name,description,scope,specialist_slugs,price_label,status,is_active,is_public,sort_order)
select 'Specialist Demo','Temporary free access to all specialist AIs for demonstration.','all','{}','Free demo','active',true,true,-1
where not exists(select 1 from public.subscription_plans where name='Specialist Demo');