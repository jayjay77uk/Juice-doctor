-- 0021_herne_collaboration.sql
-- HERNE collaboration layer: referral matrix, ONE shared care plan per user,
-- referrals, journey timeline and escalations. Every specialist updates the same
-- care plan and timeline so the user never starts over. Additive + idempotent.

-- The client referral matrix, loaded as data.
create table if not exists public.herne_referral_rules (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  from_specialist text not null,
  to_specialist text not null,
  trigger text not null,
  urgency text,
  handoff_instruction text,
  is_human_escalation boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organisation_id, from_specialist, to_specialist, trigger)
);

-- ONE shared care plan per user (not eight).
create table if not exists public.herne_care_plans (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  goals jsonb not null default '[]'::jsonb,
  concerns jsonb not null default '[]'::jsonb,
  herne_priorities jsonb not null default '[]'::jsonb,
  assigned_specialists text[] not null default '{}',
  wearable_summary jsonb not null default '{}'::jsonb,
  review_dates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One ACTIVE plan per user.
create unique index if not exists herne_care_plans_active_uniq
  on public.herne_care_plans (user_id) where status = 'active';

-- Recommendations / actions on the shared plan, attributed to a contributing specialist.
create table if not exists public.herne_care_plan_actions (
  id uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references public.herne_care_plans(id) on delete cascade,
  specialist text not null,
  kind text not null default 'recommendation',
  title text not null,
  detail text,
  status text not null default 'pending', -- pending | current | completed
  evidence_refs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists herne_care_plan_actions_plan_idx on public.herne_care_plan_actions (care_plan_id);

-- Referral log — full context preserved so nothing is lost on handoff.
create table if not exists public.herne_referrals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  care_plan_id uuid references public.herne_care_plans(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  from_specialist text not null,
  to_specialist text,
  to_human_role text,
  trigger text,
  reason text,
  urgency text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists herne_referrals_user_idx on public.herne_referrals (user_id, created_at desc);

-- The user's wellbeing journey timeline.
create table if not exists public.herne_timeline_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  care_plan_id uuid references public.herne_care_plans(id) on delete set null,
  type text not null,
  title text not null,
  detail text,
  specialist text,
  created_at timestamptz not null default now()
);
create index if not exists herne_timeline_user_idx on public.herne_timeline_events (user_id, created_at desc);

-- Escalations (low confidence, outside scope, emergency, human/clinical review, admin support).
create table if not exists public.herne_escalations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  care_plan_id uuid references public.herne_care_plans(id) on delete set null,
  conversation_id uuid,
  trigger text not null,
  reason text,
  specialist text,
  destination text,
  urgency text,
  created_at timestamptz not null default now()
);
create index if not exists herne_escalations_user_idx on public.herne_escalations (user_id, created_at desc);
