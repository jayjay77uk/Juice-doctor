-- ============================================================================
-- Ask Juice Doctor AI — ROW LEVEL SECURITY (PAPER / PHASE-2 REFERENCE)
--
-- Designed now so the security model isn't an afterthought. Not executed by the
-- prototype. Principle: published marketing content is world-readable; writes
-- and private data are locked to their owner or to admins.
-- ============================================================================

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ── Public marketing content: read published rows; write = admin only ───────
alter table public.programmes       enable row level security;
alter table public.consultations    enable row level security;
alter table public.testimonials     enable row level security;
alter table public.podcast_episodes enable row level security;
alter table public.resources        enable row level security;

create policy "programmes read published"
  on public.programmes for select using (published or public.is_admin());
create policy "programmes admin write"
  on public.programmes for all using (public.is_admin()) with check (public.is_admin());

-- (identical read-published / admin-write pair repeated for consultations,
--  testimonials, podcast_episodes, resources — omitted here for brevity)

-- ── Profiles: a user sees/updates their own; admins see all ─────────────────
alter table public.profiles enable row level security;
create policy "profiles self read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── Form submissions: anyone may insert; only admins may read ───────────────
alter table public.contact_messages       enable row level security;
alter table public.newsletter_subscribers enable row level security;
create policy "contact insert" on public.contact_messages
  for insert with check (true);
create policy "contact admin read" on public.contact_messages
  for select using (public.is_admin());
create policy "newsletter insert" on public.newsletter_subscribers
  for insert with check (true);
create policy "newsletter admin read" on public.newsletter_subscribers
  for select using (public.is_admin());

-- ── Bookings: a user manages their own; admins see all ──────────────────────
alter table public.bookings enable row level security;
create policy "bookings owner read" on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());
create policy "bookings insert" on public.bookings
  for insert with check (user_id = auth.uid() or user_id is null);
create policy "bookings admin manage" on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());
