-- Additive productization foundation. Apply to Juice Doctor only.
create table if not exists public.provider_usage_budgets (
  provider text not null, period text not null, units bigint not null default 0 check (units >= 0),
  primary key (provider, period)
);
alter table public.provider_usage_budgets enable row level security;
revoke all on public.provider_usage_budgets from anon, authenticated;
grant select, insert, update, delete on public.provider_usage_budgets to service_role;

create or replace function public.reserve_free_provider_usage(p_provider text, p_units integer, p_day_limit integer, p_month_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare d text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
 m text := case when p_provider = 'deepgram' then 'trial' else to_char(now() at time zone 'UTC', 'YYYY-MM') end;
 day_used bigint; month_used bigint;
begin
 if p_units <= 0 or p_day_limit <= 0 or p_month_limit <= 0 or p_provider not in ('deepgram','elevenlabs','resend','posthog','sentry') then return false; end if;
 -- Serialises same-provider reservations, including concurrent cold starts.
 perform pg_advisory_xact_lock(hashtextextended('free-provider:' || p_provider, 0));
 insert into public.provider_usage_budgets(provider, period) values(p_provider, d), (p_provider, m) on conflict do nothing;
 select units into day_used from public.provider_usage_budgets where provider = p_provider and period = d;
 select units into month_used from public.provider_usage_budgets where provider = p_provider and period = m;
 if day_used + p_units > p_day_limit or month_used + p_units > p_month_limit then return false; end if;
 update public.provider_usage_budgets set units = units + p_units where provider = p_provider and period in (d,m);
 return true;
end $$;
revoke all on function public.reserve_free_provider_usage(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_free_provider_usage(text, integer, integer, integer) to service_role;

create table if not exists public.request_rate_limits (
  key text primary key, window_start timestamptz not null, expires_at timestamptz not null, count integer not null
);
alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.request_rate_limits to service_role;
create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_ms integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare t timestamptz := to_timestamp(floor(extract(epoch from clock_timestamp()) * 1000 / p_window_ms) * p_window_ms / 1000);
 n integer;
begin
 if p_limit < 1 or p_window_ms < 1000 then return -1; end if;
 insert into public.request_rate_limits as buckets(key, window_start, expires_at, count)
 values(p_key, t, t + (p_window_ms || ' milliseconds')::interval, 1)
 on conflict(key) do update set window_start = excluded.window_start, expires_at = excluded.expires_at,
 count = case when buckets.window_start = excluded.window_start then least(buckets.count + 1, p_limit + 1) else 1 end
 returning count into n;
 return case when n > p_limit then -1 else p_limit - n end;
end $$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
insert into public.ai_model_providers(key, display_name, organisation_id)
values('anthropic', 'Anthropic', null) on conflict do nothing;
create table if not exists public.member_onboarding (
 user_id uuid primary key references auth.users(id) on delete cascade,
 answers jsonb not null default '{}'::jsonb,
 step integer not null default 0 check(step between 0 and 4),
 completed_at timestamptz, updated_at timestamptz not null default now()
);
alter table public.member_onboarding enable row level security;
create policy onboarding_owner on public.member_onboarding for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.member_onboarding to authenticated, service_role;
alter table public.health_profiles add column if not exists onboarding_basics jsonb not null default '{}'::jsonb;
alter table public.goals add column if not exists onboarding_key text;
create unique index if not exists goals_onboarding_key on public.goals(user_id, onboarding_key) where onboarding_key is not null;
grant select, insert, update, delete on public.goals, public.health_profiles, public.user_preferences to authenticated;

create or replace function public.save_member_onboarding(p_answers jsonb, p_step integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); org uuid; g text; label text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_step not between 0 and 4 or (p_answers->>'consentHealth')::boolean is not true then raise exception 'Invalid onboarding'; end if;
 select organisation_id into org from public.profiles where id = uid;
 if org is null then raise exception 'Member organisation unavailable'; end if;
 insert into public.member_onboarding(user_id, answers, step, completed_at)
 values(uid, p_answers, p_step, case when p_step = 4 then now() end)
 on conflict(user_id) do update set answers = excluded.answers, step = excluded.step,
 completed_at = case when excluded.step = 4 then coalesce(member_onboarding.completed_at, now()) else member_onboarding.completed_at end, updated_at = now();
 insert into public.health_profiles(user_id, organisation_id, onboarding_basics)
 values(uid, org, p_answers - array['emailCheckins','dailyNudges','sharePractitioner','inAppFollowups'])
 on conflict(user_id) do update set onboarding_basics = excluded.onboarding_basics;
 insert into public.user_preferences(user_id, email_notifications, push_notifications, preferences)
 values(uid, coalesce((p_answers->>'emailCheckins')::boolean,false), coalesce((p_answers->>'dailyNudges')::boolean,false),
 jsonb_build_object('in_app_followups', coalesce((p_answers->>'inAppFollowups')::boolean,false), 'share_with_practitioner', coalesce((p_answers->>'sharePractitioner')::boolean,false)))
 on conflict(user_id) do update set email_notifications = excluded.email_notifications, push_notifications = excluded.push_notifications,
 preferences = user_preferences.preferences || excluded.preferences;
 delete from public.goals where user_id = uid and onboarding_key is not null and not (p_answers->'goals' ? onboarding_key);
 for g in select jsonb_array_elements_text(p_answers->'goals') loop
  label := case g when 'hydration' then 'Build hydration habits' when 'sleep' then 'Improve sleep routines' when 'nutrition' then 'Eat more consistently' when 'fitness' then 'Move more regularly' when 'stress' then 'Manage everyday stress' else 'Improve everyday wellbeing' end;
  insert into public.goals(user_id, organisation_id, category, title, onboarding_key)
  values(uid, org, (case when g = 'fitness' then 'movement' when g in ('hydration','sleep','nutrition','wellbeing') then g else 'other' end)::public.goal_category, label, g)
  on conflict(user_id, onboarding_key) where onboarding_key is not null do nothing;
 end loop;
end $$;
revoke all on function public.save_member_onboarding(jsonb, integer) from public, anon;
grant execute on function public.save_member_onboarding(jsonb, integer) to authenticated;
create table if not exists public.ai_tool_executions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 agent_id uuid not null references public.ai_agents(id), tool_id uuid not null references public.ai_tools(id),
 call_id text not null, input jsonb not null default '{}'::jsonb,
 status text not null check(status in ('awaiting_confirmation','running','completed','failed','declined')),
 created_at timestamptz not null default now(), completed_at timestamptz,
 unique(conversation_id,call_id)
);
alter table public.ai_tool_executions enable row level security;
create policy tool_execution_owner on public.ai_tool_executions for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.ai_tool_executions to authenticated;
grant select,insert,update,delete on public.ai_tool_executions to service_role;
insert into public.ai_tools(organisation_id,key,name,description,handler_ref,is_sensitive,input_schema)
select o.id, t.key, t.name, t.name, 'member.' || t.key, t.sensitive,
 jsonb_build_object('type','object','properties',case when t.sensitive then '{"reason":{"type":"string","maxLength":200}}'::jsonb else '{}'::jsonb end,'additionalProperties',false)
from public.organisations o cross join (values('read_goals','Read saved goals',false),('read_care_plan','Read shared care plan',false),('read_appointments','Read appointments',false),('request_human_support','Request human support',true)) as t(key,name,sensitive)
on conflict(organisation_id,key) do nothing;
insert into public.ai_agent_tools(agent_id,tool_id)
select a.id,t.id from public.ai_agents a join public.ai_tools t on t.organisation_id = a.organisation_id
where a.kind = 'specialist' and t.handler_ref in ('member.read_goals','member.read_care_plan','member.read_appointments','member.request_human_support') on conflict do nothing;
