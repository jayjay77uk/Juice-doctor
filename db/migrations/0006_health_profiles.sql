-- ============================================================================
-- Migration: 0006_health_profiles.sql
-- Domain:    HEALTH — sensitive personal health data (PHI-grade)
-- ----------------------------------------------------------------------------
-- WHY these modelling decisions:
--
--  * This domain holds the most sensitive data in the platform: dates of birth,
--    biological sex, diagnosed conditions, medications, allergies and emergency
--    contacts. The RLS posture is therefore the STRICTEST in the codebase:
--    a row is visible/writable ONLY to (a) its owning user, (b) treating
--    practitioners/staff within the SAME organisation (read-only, for care),
--    and (c) organisation administrators (manage). Nothing here is EVER public.
--
--  * The "profile" style tables (health / fitness / nutrition) are strict 1:1
--    extensions of a user, so — per the established convention for 1:1 tables —
--    they are keyed directly by `user_id` (PK = FK to auth.users) rather than a
--    surrogate uuid. This guarantees at-most-one row per user at the schema
--    level and removes an unnecessary join key.
--
--  * `organisation_id` is denormalised onto every table (rather than derived via
--    a join) because RLS policies must scope reads to `app.current_org_id()`
--    cheaply and index-ably on every single row access. It is NOT NULL because
--    all health data in this platform is captured within a tenant context.
--
--  * Semi-structured, evolving clinical data (medications, family history,
--    emergency contact, questionnaire answers, baseline metrics, preferences)
--    is stored as jsonb. Flat, queryable, set-like attributes (conditions,
--    allergies, restrictions, intolerances) use text[] for simple containment
--    filtering without a child table.
--
--  * medical_questionnaires is intentionally a mutable, reviewable record — a
--    practitioner/staff reviewer may write back review fields (reviewed_by /
--    reviewed_at / status) via a dedicated policy, while the owner controls the
--    answers. It is NOT append-only (unlike audit logs) because it has a genuine
--    draft -> submitted -> reviewed lifecycle.
--
--  * goals tracks measurable, time-bound targets with baseline/current/target
--    values so progress can be computed and rendered without recomputation.
--
-- Depends on (already created in 0001–0005 — DO NOT recreate):
--    auth.users, public.organisations, public.profiles, app.set_updated_at(),
--    app.current_org_id(), app.is_staff(), app.is_admin(), app.is_super_admin(),
--    app.current_role(), app_role, record_status.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Enums (namespaced with an `hp_`/domain-clear prefix to avoid collisions)
-- ---------------------------------------------------------------------------

-- Biological sex is a clinical attribute (distinct from gender identity) used
-- for dosing / reference-range calculations; kept minimal and clinically framed.
create type public.biological_sex as enum (
  'female',
  'male',
  'intersex',
  'unknown',
  'prefer_not_to_say'
);

-- Lifecycle of a medical questionnaire submission.
create type public.questionnaire_status as enum (
  'draft',       -- being filled in by the user, not yet submitted
  'submitted',   -- user has submitted; awaiting clinical review
  'reviewed'     -- a practitioner/staff member has reviewed it
);

-- Self-reported / assessed baseline activity level.
create type public.activity_level as enum (
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'athlete'
);

-- Category a wellbeing goal belongs to (drives UI grouping & suggestions).
create type public.goal_category as enum (
  'hydration',
  'nutrition',
  'movement',
  'sleep',
  'weight',
  'wellbeing',
  'other'
);

-- Lifecycle of a user goal.
create type public.goal_status as enum (
  'active',
  'achieved',
  'paused',
  'abandoned'
);


-- ===========================================================================
-- health_profiles — 1:1 core clinical profile (PK = user_id)
-- ===========================================================================
create table public.health_profiles (
  user_id           uuid primary key
                       references auth.users (id) on delete cascade,
  organisation_id   uuid not null
                       references public.organisations (id) on delete cascade,

  date_of_birth     date,
  biological_sex    public.biological_sex,
  height_cm         numeric(5, 2),          -- e.g. 178.50
  weight_kg         numeric(5, 2),          -- e.g. 74.30
  blood_type        text,                   -- free text (e.g. 'O+', 'AB-')

  conditions        text[] not null default '{}',   -- diagnosed conditions
  allergies         text[] not null default '{}',   -- known allergies

  medications       jsonb  not null default '[]'::jsonb,  -- [{name, dose, freq}]
  family_history    jsonb  not null default '{}'::jsonb,  -- structured hx
  emergency_contact jsonb  not null default '{}'::jsonb,  -- {name, phone, rel}

  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.health_profiles is
  'One-to-one PHI-grade clinical profile per user (DOB, biological sex, vitals, conditions, allergies, medications, family history, emergency contact). Strictest RLS: owner + treating org practitioner/staff (read) + org admin only.';

create index health_profiles_organisation_id_idx
  on public.health_profiles (organisation_id);

create trigger set_updated_at
  before update on public.health_profiles
  for each row execute function app.set_updated_at();

alter table public.health_profiles enable row level security;

-- Owner: full control over their own clinical profile.
create policy health_profiles_owner_all
  on public.health_profiles
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Treating practitioner/staff in the same org: READ ONLY (for care delivery).
create policy health_profiles_careteam_read
  on public.health_profiles
  for select
  using (app.is_staff() and organisation_id = app.current_org_id());

-- Org admin: manage all clinical profiles within their organisation.
create policy health_profiles_admin_all
  on public.health_profiles
  for all
  using (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  )
  with check (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );


-- ===========================================================================
-- medical_questionnaires — reviewable intake / assessment questionnaires
-- ===========================================================================
create table public.medical_questionnaires (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null
                     references auth.users (id) on delete cascade,
  organisation_id uuid not null
                     references public.organisations (id) on delete cascade,

  template_key    text not null,          -- identifies the questionnaire form
  title           text not null,
  status          public.questionnaire_status not null default 'draft',

  answers         jsonb not null default '{}'::jsonb,
  score           numeric,                -- computed/assessed score, nullable

  submitted_at    timestamptz,            -- set when status -> submitted
  reviewed_by     uuid references auth.users (id) on delete set null,
  reviewed_at     timestamptz,            -- set when status -> reviewed

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.medical_questionnaires is
  'Medical intake/assessment questionnaires with a draft -> submitted -> reviewed lifecycle. Owner writes answers; a treating practitioner/staff reviewer writes back review fields; org admins manage within org.';

create index medical_questionnaires_user_id_idx
  on public.medical_questionnaires (user_id);
create index medical_questionnaires_organisation_id_idx
  on public.medical_questionnaires (organisation_id);
create index medical_questionnaires_status_idx
  on public.medical_questionnaires (status);
create index medical_questionnaires_template_key_idx
  on public.medical_questionnaires (template_key);
create index medical_questionnaires_reviewed_by_idx
  on public.medical_questionnaires (reviewed_by);
-- Time-ordered listing of a user's questionnaires (most recent first).
create index medical_questionnaires_user_created_idx
  on public.medical_questionnaires (user_id, created_at desc);

create trigger set_updated_at
  before update on public.medical_questionnaires
  for each row execute function app.set_updated_at();

alter table public.medical_questionnaires enable row level security;

-- Owner: full control over their own questionnaires (fill in, submit, delete).
create policy medical_questionnaires_owner_all
  on public.medical_questionnaires
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Treating practitioner/staff in the same org: READ any questionnaire (care).
create policy medical_questionnaires_careteam_read
  on public.medical_questionnaires
  for select
  using (app.is_staff() and organisation_id = app.current_org_id());

-- Treating practitioner/staff reviewer: may UPDATE (write back review fields).
-- Scoped to same-org staff; the owner check above still governs owner writes.
create policy medical_questionnaires_reviewer_update
  on public.medical_questionnaires
  for update
  using (app.is_staff() and organisation_id = app.current_org_id())
  with check (app.is_staff() and organisation_id = app.current_org_id());

-- Org admin: manage all questionnaires within their organisation.
create policy medical_questionnaires_admin_all
  on public.medical_questionnaires
  for all
  using (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  )
  with check (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );


-- ===========================================================================
-- fitness_profiles — 1:1 fitness baseline (PK = user_id)
-- ===========================================================================
create table public.fitness_profiles (
  user_id               uuid primary key
                           references auth.users (id) on delete cascade,
  organisation_id       uuid not null
                           references public.organisations (id) on delete cascade,

  activity_level        public.activity_level,
  resting_heart_rate    int,               -- bpm
  vo2max                numeric(5, 2),     -- ml/kg/min
  baseline_metrics      jsonb not null default '{}'::jsonb,
  training_days_per_week int,

  notes                 text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.fitness_profiles is
  'One-to-one fitness baseline per user (activity level, resting HR, VO2max, baseline metrics, training frequency). Same strict RLS as health_profiles: owner + treating org staff (read) + org admin.';

create index fitness_profiles_organisation_id_idx
  on public.fitness_profiles (organisation_id);

create trigger set_updated_at
  before update on public.fitness_profiles
  for each row execute function app.set_updated_at();

alter table public.fitness_profiles enable row level security;

create policy fitness_profiles_owner_all
  on public.fitness_profiles
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy fitness_profiles_careteam_read
  on public.fitness_profiles
  for select
  using (app.is_staff() and organisation_id = app.current_org_id());

create policy fitness_profiles_admin_all
  on public.fitness_profiles
  for all
  using (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  )
  with check (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );


-- ===========================================================================
-- nutrition_profiles — 1:1 nutrition baseline (PK = user_id)
-- ===========================================================================
create table public.nutrition_profiles (
  user_id             uuid primary key
                         references auth.users (id) on delete cascade,
  organisation_id     uuid not null
                         references public.organisations (id) on delete cascade,

  dietary_pattern     text,                       -- e.g. 'vegan', 'keto'
  restrictions        text[] not null default '{}',   -- e.g. dietary rules
  intolerances        text[] not null default '{}',   -- e.g. lactose, gluten
  hydration_target_ml int,
  preferences         jsonb not null default '{}'::jsonb,

  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.nutrition_profiles is
  'One-to-one nutrition baseline per user (dietary pattern, restrictions, intolerances, hydration target, preferences). Same strict RLS as health_profiles: owner + treating org staff (read) + org admin.';

create index nutrition_profiles_organisation_id_idx
  on public.nutrition_profiles (organisation_id);

create trigger set_updated_at
  before update on public.nutrition_profiles
  for each row execute function app.set_updated_at();

alter table public.nutrition_profiles enable row level security;

create policy nutrition_profiles_owner_all
  on public.nutrition_profiles
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy nutrition_profiles_careteam_read
  on public.nutrition_profiles
  for select
  using (app.is_staff() and organisation_id = app.current_org_id());

create policy nutrition_profiles_admin_all
  on public.nutrition_profiles
  for all
  using (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  )
  with check (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );


-- ===========================================================================
-- goals — measurable, time-bound wellbeing goals
-- ===========================================================================
create table public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null
                     references auth.users (id) on delete cascade,
  organisation_id uuid not null
                     references public.organisations (id) on delete cascade,

  category        public.goal_category not null default 'other',
  title           text not null,
  description     text,

  target_value    numeric,
  unit            text,                  -- e.g. 'ml', 'kg', 'steps'
  baseline_value  numeric,
  current_value   numeric,
  target_date     date,

  status          public.goal_status not null default 'active',
  progress        int not null default 0,   -- 0..100 percent complete

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint goals_progress_range check (progress between 0 and 100)
);

comment on table public.goals is
  'Measurable, time-bound wellbeing goals per user (category, target/baseline/current values, progress, status). Same strict RLS as other health data: owner + treating org staff (read) + org admin.';

create index goals_user_id_idx
  on public.goals (user_id);
create index goals_organisation_id_idx
  on public.goals (organisation_id);
create index goals_status_idx
  on public.goals (status);
create index goals_category_idx
  on public.goals (category);
-- Time-ordered listing of a user's goals (most recent first).
create index goals_user_created_idx
  on public.goals (user_id, created_at desc);

create trigger set_updated_at
  before update on public.goals
  for each row execute function app.set_updated_at();

alter table public.goals enable row level security;

create policy goals_owner_all
  on public.goals
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy goals_careteam_read
  on public.goals
  for select
  using (app.is_staff() and organisation_id = app.current_org_id());

create policy goals_admin_all
  on public.goals
  for all
  using (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  )
  with check (
    (app.is_admin() and organisation_id = app.current_org_id())
    or app.is_super_admin()
  );

-- ============================================================================
-- End of 0006_health_profiles.sql
-- ============================================================================
