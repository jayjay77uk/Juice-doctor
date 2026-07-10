-- ============================================================================
-- Ask Juice Doctor AI — DATABASE SCHEMA (PAPER / PHASE-2 REFERENCE)
--
-- This schema is a Phase-1 DELIVERABLE, not executed by the prototype. It exists
-- so the TypeScript content model (`src/types/content.ts`) is derived from real
-- table shapes, and so moving to Supabase in Phase 2 is "fill in the provider",
-- not a data-modelling exercise. Postgres / Supabase dialect.
-- ============================================================================

-- Supabase provides auth.users. Public profile + role live alongside it.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  role          text not null default 'member' check (role in ('member', 'admin')),
  created_at    timestamptz not null default now()
);

-- HERNE pillars are a fixed enum in the app, but persisted for programme joins.
create type herne_pillar as enum ('hydration', 'elimination', 'rest', 'nutrition', 'exercise');
create type programme_format as enum ('1:1', 'group', 'corporate', 'self-paced');

create table public.programmes (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  summary        text not null,
  description    text not null,
  duration_label text not null,
  format         programme_format not null,
  price_label    text not null,
  includes       text[] not null default '{}',
  pillars        herne_pillar[] not null default '{}',
  featured       boolean not null default false,
  image_path     text,               -- Supabase Storage path (see storage.md)
  image_alt      text not null,
  sort_order     int not null default 0,
  published      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.consultations (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  summary        text not null,
  duration_label text not null,
  price_label    text not null,
  for_whom       text not null,
  includes       text[] not null default '{}',
  sort_order     int not null default 0,
  published      boolean not null default true
);

create table public.testimonials (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  role             text not null,
  quote            text not null,
  result           text,
  condition_tag    text,
  is_self_reported boolean not null default true,
  image_path       text,
  image_alt        text,
  published        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table public.podcast_episodes (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  number         int not null,
  title          text not null,
  summary        text not null,
  duration_label text not null,
  published_label text not null,
  topics         text[] not null default '{}',
  audio_url      text,               -- null until real hosting is connected
  published      boolean not null default true,
  created_at     timestamptz not null default now()
);

create type resource_category as enum ('article', 'guide', 'recipe', 'video');

create table public.resources (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  excerpt           text not null,
  category          resource_category not null,
  reading_time_label text not null,
  published_label   text not null,
  image_path        text,
  image_alt         text not null,
  body              text,             -- long-form markdown, Phase-2 content
  published         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Write-path targets (forms). Populated by Server Actions in Phase 2.
create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete set null,
  service_slug text not null,
  slot         text not null,
  name         text not null,
  email        text not null,
  notes        text,
  status       text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  created_at   timestamptz not null default now()
);

create index on public.programmes (published, sort_order);
create index on public.resources (published, category);
create index on public.podcast_episodes (published, number desc);
create index on public.bookings (user_id, created_at desc);
