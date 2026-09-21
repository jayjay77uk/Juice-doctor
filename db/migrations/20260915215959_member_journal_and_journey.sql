begin;
create table public.member_journal (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_date date not null,
 title text not null check (char_length(title) between 1 and 120),
 body text not null check (char_length(body) between 1 and 5000),
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index member_journal_owner_date on public.member_journal(user_id, entry_date desc, id) where archived_at is null;
alter table public.member_journal enable row level security;
revoke all on public.member_journal from anon, authenticated;
grant select, insert, update on public.member_journal to authenticated;
grant all on public.member_journal to service_role;
create policy journal_owner_select on public.member_journal for select to authenticated using ((select auth.uid()) = user_id);
create policy journal_owner_insert on public.member_journal for insert to authenticated with check ((select auth.uid()) = user_id);
create policy journal_owner_update on public.member_journal for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.member_journeys (
 user_id uuid primary key references auth.users(id) on delete cascade,
 focus text not null check (focus in ('wellbeing','hydration','sleep','nutrition','fitness','stress')),
 updated_at timestamptz not null default now()
);
alter table public.member_journeys enable row level security;
revoke all on public.member_journeys from anon, authenticated;
grant select, insert, update on public.member_journeys to authenticated;
grant all on public.member_journeys to service_role;
create policy journey_owner_select on public.member_journeys for select to authenticated using ((select auth.uid()) = user_id);
create policy journey_owner_insert on public.member_journeys for insert to authenticated with check ((select auth.uid()) = user_id);
create policy journey_owner_update on public.member_journeys for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
