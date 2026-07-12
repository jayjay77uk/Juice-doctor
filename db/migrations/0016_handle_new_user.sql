-- 0016_handle_new_user.sql
-- Guarantee every authenticated user has a public.profiles row so their role is
-- always resolvable. Previously nothing created a profile on sign-up (register()
-- inserted an auth user but no profile, and there was no trigger), so a
-- self-registered user had no profiles row and silently resolved to 'member'.
--
-- Additive + idempotent: the trigger only fills a missing row (ON CONFLICT DO
-- NOTHING), so hand-seeded profiles (e.g. the administrator) are never altered.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, status)
  values (new.id, new.email, 'member', 'active')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: any existing auth user that has no profile row yet.
insert into public.profiles (id, email, role, status)
select u.id, u.email, 'member', 'active'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
