# Ask Juice Doctor AI

A multi-specialist AI wellbeing platform: live Anthropic Claude AI (receptionist + eight HERNE specialists), real Supabase Auth accounts and a live Supabase Postgres database, behind a full admin portal.

> **Integration status.** No payments provider is connected (subscription payments are recorded manually) and no email provider is connected (the only email sent is the password-reset message; contact/newsletter/public-booking forms return an honest "not available yet" message). Wearable device integration is not connected (surfaces show empty states) and voice is planned. AI replies are grounded in the approved evidence base but are not clinically reviewed, and the platform is not for emergency use. See `docs/client/04-current-limitations.md`.

**Current status (2026-08-10):** all four phases below are delivered and live at `https://prototypeai-rose.vercel.app`. The platform runs real Claude inference (receptionist + eight HERNE specialists with streaming replies, safety pre/post checks, usage limits and per-call cost logging), real Supabase auth, and database persistence for all operational data, behind a full admin portal. Wearable device integration is not yet connected, voice is planned, and payments/email providers remain unconnected. The phase sections below are kept as delivery history.

Phase 1 delivered the **foundation**: design system, component library, all pages, the three signature features (the Framework, Assessment, Remote Selfie Scan), interim non-persistent auth + dashboards (since replaced by live Supabase Auth), and a production-shaped data/write seam — with **no AI**.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, RSC-first) |
| Language | TypeScript (`strict`) |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Primitives | Radix UI (wrapped) |
| Variants | `tailwind-variants` |
| Forms | react-hook-form + zod (+ Server Actions) |
| Icons | lucide-react |
| Fonts | Fraunces (display) + Inter (text) via `next/font` |
| Backend | Supabase (Postgres + Auth) — live; migrations in `db/migrations/` |
| AI | Anthropic Claude (live inference, default `claude-sonnet-5`) |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Without environment variables the app boots in a limited preview mode; live AI and real accounts/data require the Supabase and Anthropic keys listed in `.env.example`.

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build
```

## Architecture

Three hard layers, enforced by folder convention:

- **UI** (`src/components/`) — presentational, prop-driven, no knowledge of data origin.
- **Domain** (`src/hooks`, `src/lib`) — behaviour and helpers, backend-agnostic.
- **Services** (`src/services/`) — the only layer that touches data. **Reads** are async, server-only getters; **writes** are Server Actions. Both are production-shaped (async, paginated, error-typed), which is why Phase 2 was a provider swap, not a rewrite.

### The data & configuration seams

- **`src/config/app.ts`** — single source of truth for the app identity (`APP_NAME`) and the standing safety/status notices (`STANDING_NOTICES`). Operational data always reads the live Supabase database through the server-only service layer; the browser only ever holds the RLS-enforced anon-key auth client (used for the password-reset flow), never the service-role key.
- **`src/content/*`** — typed placeholder **marketing** content, pending client-supplied wording; all operational data lives in Supabase.
- **`src/services/actions.ts`** — auth Server Actions are real Supabase Auth (rate-limited per visitor); the marketing forms (contact, newsletter, booking) validate with zod and return an honest "not available yet" error until an email provider is connected.
- **`db/`** — the SQL migrations (with RLS) and Storage layout, applied to the live Supabase database (see `db/README.md`).

## Project structure

```
src/
├─ app/                    # App Router — routing + layouts only
│  ├─ (marketing)/         # public site (shared Header + Footer)
│  ├─ (auth)/              # login / register
│  ├─ (dashboard)/         # member dashboard (live data)
│  └─ (admin)/             # admin portal (live data)
├─ components/
│  ├─ ui/                  # primitives (Button, Card, Field, Accordion…)
│  ├─ layout/              # Header, Footer, AppShell…
│  └─ sections/            # composed section blocks + interactive flows
├─ config/                 # app mode, route registry, metadata
├─ content/                # typed placeholder marketing content
├─ services/               # server-only reads + Server Action writes
├─ lib/                    # cn(), zod schemas
└─ types/                  # content model
db/                        # SQL migrations (applied to live Supabase) + storage.md
```

## Phase 1 scope

**In:** full marketing site, 3 signature features (incl. an interactive Selfie Scan walkthrough — since retired; the page now states the feature is not yet available), an interim booking flow and non-persistent auth + member/admin dashboards (all since replaced by live Supabase-backed equivalents), legal pages, design system, SEO/sitemap, accessibility (WCAG AA target).

**Out (Phase 2):** all AI, live Supabase, real auth/RLS, payments, real-time booking, media hosting, live email, dark theme.

## Backend architecture (Phase 2)

The enterprise backend **foundation** — designed as it would exist in production, and now running live against Supabase (no payments):

- **Database** — SQL migrations in [`db/migrations/`](db/migrations) (30 today, applied to the live database) with RLS on every table. See [`db/README.md`](db/README.md).
- **Auth & RBAC** — a 6-role hierarchy, permission matrix, guards and session seam in [`src/lib/auth`](src/lib/auth); middleware in [`src/proxy.ts`](src/proxy.ts).
- **Security** — headers/CSP, rate limiting, CSRF, file validation, typed errors in [`src/lib/security`](src/lib/security).
- **Frameworks** — AI agents (data-driven), knowledge, memory (six scopes), consultations, and platform ops as typed services in [`src/services`](src/services) and models in [`src/types`](src/types).
- **Docs** — the full architecture write-up (the "why") lives in [`docs/`](docs/README.md).

## AI platform & admin portal (Phase 3)

The **AI management platform** — "build once, configure forever". Every assistant is configured through the admin dashboard; **nothing about AI behaviour is hardcoded**. Now live: database-backed stores and **real Claude inference** (no payments provider connected).

- **Admin portal** ([`src/app/(admin)`](<src/app/(admin)>)) — AI Dashboard, Agent Management (create/version/publish/configure), Prompt Management (versioned, workflowed), AI Playground (real inference, logged), Safety Centre, Memory Centre, Analytics, Knowledge Base portal, Users, Consultations, Configuration Centre, Audit Logs.
- **User dashboard** ([`src/app/(dashboard)`](<src/app/(dashboard)>)) — overview, onboarding wizard, goals, health/fitness/nutrition profile, assessments, journey timeline, bookings, saved conversations, notifications, settings.
- **Data-driven** — agents/prompts/models/tools/safety/knowledge are database rows (migration [`db/migrations/0014`](db/migrations) onward: `ai_agents` is the source of truth, and the **published** prompt version feeds live inference), managed through [`src/services`](src/services).
- **Docs** — [AI Management Platform](docs/architecture/13-ai-platform.md) · [Admin Portal & User Dashboard](docs/architecture/14-admin-and-dashboard.md).

## The AI agent system (Phase 4)

An AI agent system **representing the client** — not an AI builder, and not a generic marketplace. The lifecycle is **Receptionist AI → Specialist AIs → CRM → Administration**, reusing every Phase 2–3 module. It operates through the **existing, accepted frontend** (no new public site was imposed).

- **Receptionist AI** — the free front door (backend service + Server Actions): receives the visitor, qualifies, summarises, recommends an approved specialist, creates/updates the CRM lead, and escalates to a **configurable escalation target** (the client or an authorised team member) with WhatsApp handoff. Initially delivered with static routing rules; today the receptionist runs a **live Claude structured assessment** — roster-constrained, with a confidence threshold and honest escalation.
- **Specialist AIs** — delivered as **four configurable placeholders** (`Specialist AI 1–4`); since replaced by the **eight HERNE specialists**, live with streaming replies, whose names, codes, purposes, behaviour and knowledge remain admin-configurable data.
- **AI-centric CRM** ([`/admin/crm`](<src/app/(admin)/admin/crm>)) — leads storing the full conversation, consultation summary, recommendation + confidence, alternative matches, human-review/WhatsApp/subscription/follow-up status, progress, notes and the responsible team member.
- **Admin** organised as **Business · Receptionist AI · Specialist AIs · CRM · Administration**.
- **Docs** — [The AI Business Lifecycle](docs/architecture/15-ai-business-lifecycle.md).

## Client decisions captured (2026-07-10)

Standalone `/founder` page · pricing on cards · one Resources surface · marketing forms deferred until an email provider is connected (they now return an honest "not available yet" message) · Remote Selfie Scan deferred (the page states it is not yet available). Brand palette and typography are **proposals pending client confirmation**.
