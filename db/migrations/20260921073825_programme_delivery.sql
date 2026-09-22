begin;
create table public.programme_modules (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  title text not null check (length(title) between 1 and 160),
  body text not null check (length(body) between 1 and 20000),
  position integer not null check (position between 1 and 1000),
  created_at timestamptz not null default now(),
  unique(programme_id, position)
);
create table public.programme_module_progress (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.programme_modules(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(member_id, module_id)
);
create index on public.programme_module_progress(module_id);
alter table public.programme_modules enable row level security;
alter table public.programme_module_progress enable row level security;
revoke all on public.programme_modules, public.programme_module_progress from anon, authenticated;
grant select on public.programme_modules, public.programme_module_progress to authenticated;
grant all on public.programme_modules, public.programme_module_progress to service_role;
create policy assigned_modules_read on public.programme_modules for select to authenticated using (
  exists (select 1 from public.programme_enrollments e join public.programmes p on p.id=e.programme_id
    where e.member_id=(select auth.uid()) and e.programme_id=programme_modules.programme_id
    and e.status in ('active','completed') and p.publish_status='published')
);
create policy own_progress_read on public.programme_module_progress for select to authenticated
  using(member_id=(select auth.uid()));
-- Enrolment and progress are controlled by validated server actions. Members
-- must not self-enrol in a paid/assigned programme or forge percentage values.
revoke insert, update, delete on public.programme_enrollments from anon, authenticated;

-- Lock the parent for authoring/publication/assignment so concurrent requests
-- cannot publish an empty programme or change a curriculum during enrolment.
create function public.guard_programme_module_edit() returns trigger
language plpgsql security invoker set search_path='' as $$
declare pid uuid; state text;
begin
  pid := case when tg_op='DELETE' then old.programme_id else new.programme_id end;
  if tg_op='UPDATE' and new.programme_id<>old.programme_id then raise exception 'Modules cannot move between programmes'; end if;
  select publish_status::text into state from public.programmes where id=pid for update;
  if state is not null and (state<>'draft' or exists(select 1 from public.programme_enrollments where programme_id=pid)) then
    raise exception 'An enrolled or published curriculum cannot be edited';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
create trigger guard_programme_module_edit before insert or update or delete on public.programme_modules
for each row execute function public.guard_programme_module_edit();
create function public.guard_programme_publication() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.publish_status='published' and not exists(select 1 from public.programme_modules where programme_id=new.id) then
    raise exception 'A published programme requires modules';
  end if;
  return new;
end;
$$;
create trigger guard_programme_publication before update of publish_status on public.programmes
for each row execute function public.guard_programme_publication();
create function public.guard_programme_assignment() returns trigger
language plpgsql security invoker set search_path='' as $$
declare state text;
begin
  select publish_status::text into state from public.programmes where id=new.programme_id for update;
  if state is distinct from 'published' then raise exception 'Only published programmes can be assigned'; end if;
  return new;
end;
$$;
create trigger guard_programme_assignment before insert on public.programme_enrollments
for each row execute function public.guard_programme_assignment();
revoke all on function public.guard_programme_module_edit(), public.guard_programme_publication(), public.guard_programme_assignment() from public, anon, authenticated;

create function public.set_programme_module_complete(p_member uuid, p_module uuid, p_complete boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_programme uuid; v_enrolment uuid; v_total integer; v_done integer;
begin
  select programme_id into v_programme from public.programme_modules where id=p_module;
  select e.id into v_enrolment from public.programme_enrollments e join public.programmes p on p.id=e.programme_id
    where e.member_id=p_member and e.programme_id=v_programme and e.status in ('active','completed')
      and p.publish_status='published' for update of e;
  if v_enrolment is null then raise exception 'Programme is not available'; end if;
  if p_complete then
    insert into public.programme_module_progress(member_id,module_id) values(p_member,p_module) on conflict do nothing;
  else
    delete from public.programme_module_progress where member_id=p_member and module_id=p_module;
  end if;
  select count(*) into v_total from public.programme_modules where programme_id=v_programme;
  select count(*) into v_done from public.programme_module_progress s join public.programme_modules m on m.id=s.module_id
    where s.member_id=p_member and m.programme_id=v_programme;
  update public.programme_enrollments set progress=(100*v_done/greatest(v_total,1)),
    status=case when v_done=v_total then 'completed'::public.enrollment_status else 'active'::public.enrollment_status end,
    completed_at=case when v_done=v_total then coalesce(completed_at,now()) else null end
    where id=v_enrolment;
end;
$$;
revoke all on function public.set_programme_module_complete(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_programme_module_complete(uuid,uuid,boolean) to service_role;
commit;
