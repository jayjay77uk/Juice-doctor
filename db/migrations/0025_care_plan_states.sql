-- 0025_care_plan_states.sql
-- Increment K: replace the flat pending/current/completed status on care-plan
-- actions with a proposal state machine (proposed → user_accepted → active →
-- completed, plus declined / superseded / requires_human_review), so live
-- specialist conversations can PROPOSE updates the person accepts rather than
-- auto-publishing. Adds transition metadata + a race-safe dedup index. Idempotent.

alter table public.herne_care_plan_actions add column if not exists proposed_by text;
alter table public.herne_care_plan_actions add column if not exists accepted_at timestamptz;
alter table public.herne_care_plan_actions add column if not exists declined_at timestamptz;
alter table public.herne_care_plan_actions add column if not exists declined_reason text;
alter table public.herne_care_plan_actions add column if not exists review_reason text;
alter table public.herne_care_plan_actions add column if not exists superseded_by uuid references public.herne_care_plan_actions(id) on delete set null;

-- Normalise legacy statuses to the new closed set before constraining.
update public.herne_care_plan_actions set status = 'active'   where status = 'current';
update public.herne_care_plan_actions set status = 'proposed' where status = 'pending';
update public.herne_care_plan_actions set status = 'proposed'
  where status not in ('proposed','user_accepted','active','completed','declined','superseded','requires_human_review');

alter table public.herne_care_plan_actions drop constraint if exists herne_care_plan_actions_status_chk;
alter table public.herne_care_plan_actions add constraint herne_care_plan_actions_status_chk
  check (status in ('proposed','user_accepted','active','completed','declined','superseded','requires_human_review'));

-- Conflict prevention: at most one live action per (plan, specialist, title) while
-- it is in a non-terminal state. Declined/superseded/completed rows don't block a
-- fresh proposal of the same recommendation.
create unique index if not exists herne_cpa_active_dedup
  on public.herne_care_plan_actions (care_plan_id, specialist, lower(title))
  where status in ('proposed','user_accepted','active','requires_human_review');
