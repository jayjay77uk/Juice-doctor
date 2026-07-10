-- =============================================================================
-- Migration: 0007_consultation_workflow.sql
-- Domain:    Consultation workflow — the clinical journey a member takes through
--            the "Ask Juice Doctor AI" platform:
--
--              intake → assessment → AI review → practitioner review →
--              appointment → follow-up → history
--
-- WHY these modelling decisions:
--
--   * assessments is a generic container for every structured data-capture
--     surface (intake forms, Body MOT, Remote Selfie Scan, health
--     questionnaires). Rather than one table per capture type — which would
--     explode as new scan/assessment products ship — we keep a single table
--     discriminated by `type`, with the payload in `results jsonb`. This lets
--     the AI layer and reporting treat all assessments uniformly. `score` and
--     `ai_summary` are first-class nullable columns because they are queried /
--     filtered frequently and every assessment type produces them; deeper,
--     type-specific structure stays in `results`.
--
--   * appointments and consultations are kept SEPARATE. An appointment is the
--     scheduling artefact (a slot in time, a location, a service). A
--     consultation is the clinical encounter and its record. One appointment
--     yields (at most) one consultation, but consultations can also exist
--     without an appointment (async / AI-only reviews), hence
--     appointment_id is nullable on consultations rather than the reverse.
--
--   * consultation_events is an APPEND-ONLY timeline. Every stage transition and
--     notable action writes one immutable row. This gives us an auditable,
--     replayable history of the workflow without mutating the consultation row,
--     and cleanly powers a "history" view. No update/delete policies exist for
--     it; writes are server-side.
--
--   * follow_ups are modelled as their own scheduled records (not just a flag on
--     consultations) so a single consultation can spawn several follow-ups
--     across channels/dates, each independently tracked to completion.
--
--   * Tenancy: every table carries organisation_id for tenant isolation.
--     Member-owned rows also carry the member's auth.users id (member_id /
--     user_id / created_by) so members can read their own data via RLS while
--     staff/practitioners operate within their organisation.
--
-- Depends on migrations 0001–0005 (organisations, clinics, profiles,
-- organisation_memberships, auth.users, the app.* RLS helpers, and the
-- app.set_updated_at() trigger function). Those objects are NOT recreated here.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Enums (namespaced to this consultation domain)
-- -----------------------------------------------------------------------------

-- What kind of structured assessment a row represents.
-- body_mot + selfie_scan results land in public.assessments as well.
create type public.assessment_type as enum (
    'intake',
    'body_mot',
    'selfie_scan',
    'health_questionnaire'
);

-- Lifecycle of an assessment, from capture through practitioner review.
create type public.assessment_status as enum (
    'pending',      -- created, awaiting the member to complete it
    'in_progress',  -- member is partway through
    'complete',     -- member finished; ready for AI / practitioner
    'reviewed'      -- a practitioner has signed off
);

-- Scheduling lifecycle of an appointment.
create type public.appointment_status as enum (
    'requested',
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
);

-- Where/how an appointment takes place.
create type public.appointment_location as enum (
    'in_person',
    'video',
    'phone'
);

-- Lifecycle of the clinical encounter.
create type public.consultation_status as enum (
    'scheduled',
    'in_progress',
    'awaiting_review',  -- e.g. awaiting practitioner review after AI pass
    'completed',
    'cancelled'
);

-- Stages of the workflow timeline, recorded on consultation_events.
create type public.consultation_stage as enum (
    'intake',
    'assessment',
    'ai_review',
    'practitioner_review',
    'appointment',
    'follow_up',
    'history'
);

-- Lifecycle of a scheduled follow-up.
create type public.follow_up_status as enum (
    'pending',
    'sent',
    'completed',
    'cancelled'
);


-- =============================================================================
-- Table: assessments
-- Generic container for every structured data-capture surface.
-- =============================================================================
create table public.assessments (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null references auth.users (id) on delete cascade,
    organisation_id  uuid not null references public.organisations (id) on delete cascade,
    type             public.assessment_type   not null,
    status           public.assessment_status not null default 'pending',
    title            text not null,
    results          jsonb not null default '{}'::jsonb,
    score            numeric,                 -- nullable: not all assessments are scored yet
    ai_summary       text,                    -- placeholder for future AI-generated summary
    created_by       uuid not null references auth.users (id) on delete restrict,
    reviewed_by      uuid references auth.users (id) on delete set null,
    reviewed_at      timestamptz,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

comment on table public.assessments is
    'Structured member assessments (intake, Body MOT, Remote Selfie Scan, health questionnaires). Payload in results jsonb; score/ai_summary are first-class for filtering. Tenant-scoped by organisation_id, member-owned by user_id.';

create index assessments_user_id_idx          on public.assessments (user_id);
create index assessments_organisation_id_idx  on public.assessments (organisation_id);
create index assessments_status_idx           on public.assessments (status);
create index assessments_type_idx             on public.assessments (type);
create index assessments_reviewed_by_idx      on public.assessments (reviewed_by);
create index assessments_created_at_idx       on public.assessments (created_at desc);

create trigger set_updated_at
    before update on public.assessments
    for each row execute function app.set_updated_at();

alter table public.assessments enable row level security;

-- Member reads their own assessments.
create policy assessments_select_own
    on public.assessments for select
    using (user_id = auth.uid());

-- Staff / practitioners read assessments within their organisation.
create policy assessments_select_staff
    on public.assessments for select
    using (organisation_id = app.current_org_id() and app.is_staff());

-- Super administrators read across the platform.
create policy assessments_select_super_admin
    on public.assessments for select
    using (app.is_super_admin());

-- Member may create/update their own assessments (created_by must be them).
create policy assessments_insert_own
    on public.assessments for insert
    with check (user_id = auth.uid() and created_by = auth.uid());

create policy assessments_update_own
    on public.assessments for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Staff / practitioners create + manage assessments within their organisation
-- (this is how a practitioner records review outcomes).
create policy assessments_insert_staff
    on public.assessments for insert
    with check (organisation_id = app.current_org_id() and app.is_staff());

create policy assessments_update_staff
    on public.assessments for update
    using (organisation_id = app.current_org_id() and app.is_staff())
    with check (organisation_id = app.current_org_id() and app.is_staff());

-- Only admins may delete within their organisation.
create policy assessments_delete_admin
    on public.assessments for delete
    using (organisation_id = app.current_org_id() and app.is_admin());


-- =============================================================================
-- Table: appointments
-- Scheduling artefact — a slot in time for a service at a location.
-- =============================================================================
create table public.appointments (
    id               uuid primary key default gen_random_uuid(),
    organisation_id  uuid not null references public.organisations (id) on delete cascade,
    clinic_id        uuid references public.clinics (id) on delete set null,
    member_id        uuid not null references auth.users (id) on delete cascade,
    practitioner_id  uuid references auth.users (id) on delete set null,
    service_slug     text not null,
    status           public.appointment_status   not null default 'requested',
    location_type    public.appointment_location not null default 'in_person',
    scheduled_start  timestamptz not null,
    scheduled_end    timestamptz not null,
    notes            text,
    created_by       uuid not null references auth.users (id) on delete restrict,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),

    constraint appointments_time_order_chk check (scheduled_end > scheduled_start)
);

comment on table public.appointments is
    'Scheduled appointment slots (service, location, practitioner, time). Distinct from consultations (the clinical encounter). Tenant-scoped by organisation_id; member-owned by member_id.';

create index appointments_organisation_id_idx  on public.appointments (organisation_id);
create index appointments_clinic_id_idx         on public.appointments (clinic_id);
create index appointments_member_id_idx         on public.appointments (member_id);
create index appointments_practitioner_id_idx   on public.appointments (practitioner_id);
create index appointments_status_idx            on public.appointments (status);
create index appointments_scheduled_start_idx   on public.appointments (scheduled_start desc);

create trigger set_updated_at
    before update on public.appointments
    for each row execute function app.set_updated_at();

alter table public.appointments enable row level security;

-- Member reads their own appointments.
create policy appointments_select_own
    on public.appointments for select
    using (member_id = auth.uid());

-- The assigned practitioner reads their appointments.
create policy appointments_select_practitioner
    on public.appointments for select
    using (practitioner_id = auth.uid());

-- Staff read appointments within their organisation.
create policy appointments_select_staff
    on public.appointments for select
    using (organisation_id = app.current_org_id() and app.is_staff());

create policy appointments_select_super_admin
    on public.appointments for select
    using (app.is_super_admin());

-- Member may request (create) an appointment for themselves.
create policy appointments_insert_own
    on public.appointments for insert
    with check (member_id = auth.uid() and created_by = auth.uid());

-- Staff manage appointments within their organisation (confirm, reschedule, assign).
create policy appointments_insert_staff
    on public.appointments for insert
    with check (organisation_id = app.current_org_id() and app.is_staff());

create policy appointments_update_staff
    on public.appointments for update
    using (organisation_id = app.current_org_id() and app.is_staff())
    with check (organisation_id = app.current_org_id() and app.is_staff());

-- Member may update their own appointment only while it is still just requested
-- (e.g. to add notes or cancel a pending request).
create policy appointments_update_own
    on public.appointments for update
    using (member_id = auth.uid() and status = 'requested')
    with check (member_id = auth.uid());

-- Only admins may delete within their organisation.
create policy appointments_delete_admin
    on public.appointments for delete
    using (organisation_id = app.current_org_id() and app.is_admin());


-- =============================================================================
-- Table: consultations
-- The clinical encounter and its record.
-- =============================================================================
create table public.consultations (
    id                  uuid primary key default gen_random_uuid(),
    organisation_id     uuid not null references public.organisations (id) on delete cascade,
    appointment_id      uuid references public.appointments (id) on delete set null,
    member_id           uuid not null references auth.users (id) on delete cascade,
    practitioner_id     uuid references auth.users (id) on delete set null,
    status              public.consultation_status not null default 'scheduled',
    reason              text,
    ai_review           jsonb,               -- placeholder for future AI review output
    practitioner_notes  text,
    summary             text,
    started_at          timestamptz,
    ended_at            timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table public.consultations is
    'Clinical encounter record. Optionally linked to an appointment; may exist standalone for async/AI-only reviews. Holds ai_review, practitioner_notes and summary. Tenant-scoped by organisation_id; member-owned by member_id.';

create index consultations_organisation_id_idx  on public.consultations (organisation_id);
create index consultations_appointment_id_idx   on public.consultations (appointment_id);
create index consultations_member_id_idx        on public.consultations (member_id);
create index consultations_practitioner_id_idx  on public.consultations (practitioner_id);
create index consultations_status_idx           on public.consultations (status);
create index consultations_created_at_idx       on public.consultations (created_at desc);

create trigger set_updated_at
    before update on public.consultations
    for each row execute function app.set_updated_at();

alter table public.consultations enable row level security;

-- Member reads their own consultations.
create policy consultations_select_own
    on public.consultations for select
    using (member_id = auth.uid());

-- The assigned practitioner reads their consultations.
create policy consultations_select_practitioner
    on public.consultations for select
    using (practitioner_id = auth.uid());

-- Staff read consultations within their organisation.
create policy consultations_select_staff
    on public.consultations for select
    using (organisation_id = app.current_org_id() and app.is_staff());

create policy consultations_select_super_admin
    on public.consultations for select
    using (app.is_super_admin());

-- Staff / practitioners create + manage consultations within their organisation.
create policy consultations_insert_staff
    on public.consultations for insert
    with check (organisation_id = app.current_org_id() and app.is_staff());

create policy consultations_update_staff
    on public.consultations for update
    using (organisation_id = app.current_org_id() and app.is_staff())
    with check (organisation_id = app.current_org_id() and app.is_staff());

-- The assigned practitioner may update their own consultation (record notes,
-- ai_review sign-off, summary) even if not a general staff member.
create policy consultations_update_practitioner
    on public.consultations for update
    using (practitioner_id = auth.uid() and organisation_id = app.current_org_id())
    with check (practitioner_id = auth.uid() and organisation_id = app.current_org_id());

-- Only admins may delete within their organisation.
create policy consultations_delete_admin
    on public.consultations for delete
    using (organisation_id = app.current_org_id() and app.is_admin());


-- =============================================================================
-- Table: consultation_events  (APPEND-ONLY workflow timeline)
-- One immutable row per stage transition / notable action.
-- =============================================================================
create table public.consultation_events (
    id               uuid primary key default gen_random_uuid(),
    consultation_id  uuid not null references public.consultations (id) on delete cascade,
    stage            public.consultation_stage not null,
    actor_id         uuid references auth.users (id) on delete set null,
    title            text not null,
    data             jsonb not null default '{}'::jsonb,
    created_at       timestamptz not null default now()
);

comment on table public.consultation_events is
    'Append-only workflow timeline for a consultation (intake → assessment → ai_review → practitioner_review → appointment → follow_up → history). Immutable: no update/delete. Powers auditable history views. Writes are server-side.';

create index consultation_events_consultation_id_idx on public.consultation_events (consultation_id);
create index consultation_events_stage_idx           on public.consultation_events (stage);
create index consultation_events_actor_id_idx        on public.consultation_events (actor_id);
create index consultation_events_created_at_idx      on public.consultation_events (created_at desc);

alter table public.consultation_events enable row level security;

-- Read events for a consultation the caller is entitled to see:
-- the owning member, the assigned practitioner, or org staff.
-- (Deliberately no UPDATE/DELETE policies — this log is immutable.)
create policy consultation_events_select_entitled
    on public.consultation_events for select
    using (
        exists (
            select 1
            from public.consultations c
            where c.id = consultation_events.consultation_id
              and (
                    c.member_id = auth.uid()
                 or c.practitioner_id = auth.uid()
                 or (c.organisation_id = app.current_org_id() and app.is_staff())
              )
        )
        or app.is_super_admin()
    );

-- Inserts are performed server-side (service role) and are additionally tightly
-- scoped here: staff/practitioner of the consultation's organisation may append,
-- and the recorded actor must be the caller.
create policy consultation_events_insert_staff
    on public.consultation_events for insert
    with check (
        (actor_id is null or actor_id = auth.uid())
        and exists (
            select 1
            from public.consultations c
            where c.id = consultation_events.consultation_id
              and c.organisation_id = app.current_org_id()
              and app.is_staff()
        )
    );


-- =============================================================================
-- Table: follow_ups
-- Scheduled follow-up actions spawned from a consultation.
-- =============================================================================
create table public.follow_ups (
    id               uuid primary key default gen_random_uuid(),
    consultation_id  uuid not null references public.consultations (id) on delete cascade,
    member_id        uuid not null references auth.users (id) on delete cascade,
    organisation_id  uuid not null references public.organisations (id) on delete cascade,
    due_date         date not null,
    status           public.follow_up_status not null default 'pending',
    channel          text,
    notes            text,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

comment on table public.follow_ups is
    'Scheduled follow-up actions spawned from a consultation (multiple per consultation across channels/dates). Tenant-scoped by organisation_id; member-owned by member_id.';

create index follow_ups_consultation_id_idx  on public.follow_ups (consultation_id);
create index follow_ups_member_id_idx         on public.follow_ups (member_id);
create index follow_ups_organisation_id_idx   on public.follow_ups (organisation_id);
create index follow_ups_status_idx            on public.follow_ups (status);
create index follow_ups_due_date_idx          on public.follow_ups (due_date);

create trigger set_updated_at
    before update on public.follow_ups
    for each row execute function app.set_updated_at();

alter table public.follow_ups enable row level security;

-- Member reads their own follow-ups.
create policy follow_ups_select_own
    on public.follow_ups for select
    using (member_id = auth.uid());

-- Staff read follow-ups within their organisation.
create policy follow_ups_select_staff
    on public.follow_ups for select
    using (organisation_id = app.current_org_id() and app.is_staff());

create policy follow_ups_select_super_admin
    on public.follow_ups for select
    using (app.is_super_admin());

-- Staff / practitioners create + manage follow-ups within their organisation.
create policy follow_ups_insert_staff
    on public.follow_ups for insert
    with check (organisation_id = app.current_org_id() and app.is_staff());

create policy follow_ups_update_staff
    on public.follow_ups for update
    using (organisation_id = app.current_org_id() and app.is_staff())
    with check (organisation_id = app.current_org_id() and app.is_staff());

-- Member may update their own follow-up (e.g. mark completed / add notes).
create policy follow_ups_update_own
    on public.follow_ups for update
    using (member_id = auth.uid())
    with check (member_id = auth.uid());

-- Only admins may delete within their organisation.
create policy follow_ups_delete_admin
    on public.follow_ups for delete
    using (organisation_id = app.current_org_id() and app.is_admin());

-- =============================================================================
-- End of migration 0007_consultation_workflow.sql
-- =============================================================================
