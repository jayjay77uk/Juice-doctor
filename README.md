# Ask Juice Doctor AI — Prototype

A **prototype** platform for Ask Juice Doctor, built to demonstrate the full vision to the client before production development.

> ⚠️ **Prototype — for demonstration only.** Not production-ready. No live AI, real accounts, payments, patient data, or connected database. A "Prototype Environment" banner is shown in every non-production build.

Phase 1 delivers the **foundation**: design system, component library, all pages, the three signature features (HERNE Protocol, Body MOT, Remote Selfie Scan), mock auth + dashboards, and a production-shaped data/write seam — with **no AI**.

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
| Backend (Phase 2) | Supabase — designed on paper only (`db/`), not connected |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

No environment variables are required to run the prototype (see `.env.example`).

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build
```

## Architecture

Three hard layers, enforced by folder convention:

- **UI** (`src/components/`) — presentational, prop-driven, no knowledge of data origin.
- **Domain** (`src/hooks`, `src/lib`) — behaviour and helpers, backend-agnostic.
- **Services** (`src/services/`) — the only layer that touches data. **Reads** are async, server-only getters; **writes** are Server Actions. Both are production-shaped (async, paginated, error-typed) so Phase 2 is a provider swap, not a rewrite.

### The prototype → production seam

- **`src/config/app.ts`** — single source of truth. `NEXT_PUBLIC_APP_MODE` is cosmetic (drives the banner). The data provider is chosen off the **non-public** `APP_MODE`, server-side, so no Supabase client can leak into the browser bundle.
- **`src/content/*`** — typed mock data; shapes are **derived from** `db/schema.sql`.
- **`src/services/actions.ts`** — Server Actions validate with zod and return a fake success; Phase 2 swaps the body for Resend email + Supabase insert.
- **`db/`** — paper SQL schema, RLS policies and Storage layout (Phase-1 deliverable, not executed).

## Project structure

```
src/
├─ app/                    # App Router — routing + layouts only
│  ├─ (marketing)/         # public site (shared Header + Footer)
│  ├─ (auth)/              # login / register
│  ├─ (dashboard)/         # mock member shell
│  └─ (admin)/             # mock admin shell
├─ components/
│  ├─ ui/                  # primitives (Button, Card, Field, Accordion…)
│  ├─ layout/              # Header, Footer, PrototypeBanner, AppShell…
│  └─ sections/            # composed section blocks + interactive flows
├─ config/                 # app mode, route registry, metadata
├─ content/                # typed mock/seed content
├─ services/               # server-only reads + Server Action writes
├─ lib/                    # cn(), zod schemas
└─ types/                  # content model
db/                        # paper schema.sql / rls.sql / storage.md
```

## Phase 1 scope

**In:** full marketing site, 3 signature features (incl. an interactive *mocked* Selfie Scan), mock booking flow, mock auth + member/admin dashboards, legal pages, design system, SEO/sitemap, accessibility (WCAG AA target).

**Out (Phase 2):** all AI, live Supabase, real auth/RLS, payments, real-time booking, media hosting, live email, dark theme.

## Backend architecture (Phase 2)

The enterprise backend **foundation** — designed as it would exist in production, but not connected (no AI, no live data, no payments):

- **Database** — ~55 tables across 13 SQL migrations in [`db/migrations/`](db/migrations) with RLS on every table. See [`db/README.md`](db/README.md).
- **Auth & RBAC** — a 6-role hierarchy, permission matrix, guards and session seam in [`src/lib/auth`](src/lib/auth); middleware in [`src/proxy.ts`](src/proxy.ts).
- **Security** — headers/CSP, rate limiting, CSRF, file validation, typed errors in [`src/lib/security`](src/lib/security).
- **Frameworks** — AI agents (data-driven), knowledge, memory (six scopes), consultations, and platform ops as typed services in [`src/services`](src/services) and models in [`src/types`](src/types).
- **Docs** — the full architecture write-up (the "why") lives in [`docs/`](docs/README.md).

## AI platform & admin portal (Phase 3)

The **AI management platform** — "build once, configure forever". Every assistant is configured through the admin dashboard; **nothing about AI behaviour is hardcoded**. Still prototype-mode (mock stores, **no live AI**, no patient data, no payments).

- **Admin portal** ([`src/app/(admin)`](<src/app/(admin)>)) — AI Dashboard, Agent Management (create/version/publish/configure), Prompt Management (versioned, workflowed), AI Playground (isolated mock test harness), Safety Centre, Memory Centre, Analytics, Knowledge Base portal, Users, Consultations, Configuration Centre, Audit Logs.
- **User dashboard** ([`src/app/(dashboard)`](<src/app/(dashboard)>)) — overview, onboarding wizard, goals, health/fitness/nutrition profile, assessments, journey timeline, bookings, saved conversations, notifications, settings.
- **Data-driven** — agents/prompts/models/tools/safety/knowledge are data in [`src/config`](src/config) + [`src/services`](src/services) (mock), designed to swap onto migration [`db/migrations/0014`](db/migrations) in production.
- **Docs** — [AI Management Platform](docs/architecture/13-ai-platform.md) · [Admin Portal & User Dashboard](docs/architecture/14-admin-and-dashboard.md).

## The AI agent system (Phase 4)

An AI agent system **representing the client** — not an AI builder, and not a generic wellness marketplace. The lifecycle is **Receptionist AI → Specialist AIs → CRM → Administration**, reusing every Phase 2–3 module. It operates through the **existing, accepted frontend** (no new public site was imposed).

- **Receptionist AI** — the free front door (backend service + Server Actions): receives the visitor, qualifies, summarises, recommends an approved specialist, creates/updates the CRM lead, and escalates to a **configurable escalation target** (the client or an authorised team member) with WhatsApp handoff. Its routing rules, questions and confidence threshold are a **replaceable mock**, moved to configuration.
- **Specialist AIs** — **four configurable placeholders** (`Specialist AI 1–4`); their final names, codes, purposes, behaviour, pricing and knowledge are admin-configurable data, supplied by the client.
- **AI-centric CRM** ([`/admin/crm`](<src/app/(admin)/admin/crm>)) — leads storing the full conversation, consultation summary, recommendation + confidence, alternative matches, human-review/WhatsApp/subscription/follow-up status, progress, notes and the responsible team member.
- **Admin** organised as **Business · Receptionist AI · Specialist AIs · CRM · Administration**.
- **Docs** — [The AI Business Lifecycle](docs/architecture/15-ai-business-lifecycle.md).

## Client decisions captured (2026-07-10)

Standalone `/founder` page · pricing on cards · one Resources surface · forms fully mocked · Remote Selfie Scan is an interactive mocked flow. Brand palette and typography are **proposals pending client confirmation**.
