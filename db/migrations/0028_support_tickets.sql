-- 0028_support_tickets.sql
-- Real persistence for the existing member support/escalation feature.
-- Additive + idempotent.

create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  member_id       uuid not null references auth.users (id) on delete cascade,
  subject         text not null,
  message         text not null,
  status          text not null default 'open', -- open | in_progress | resolved
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists support_tickets_member_idx on public.support_tickets (member_id, created_at desc);

alter table public.support_tickets enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'support_tickets' and policyname = 'tickets_self_all') then
    create policy tickets_self_all on public.support_tickets
      for all using (member_id = auth.uid()) with check (member_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'support_tickets' and policyname = 'tickets_staff_read') then
    create policy tickets_staff_read on public.support_tickets for select using (app.is_staff());
  end if;
end $$;
