# Ask Juice Doctor AI — Architecture documentation

The complete backend & platform architecture for the Ask Juice Doctor AI platform. Documents 00–15 were produced across **Phases 2–4**, when the platform still ran on typed in-memory providers — historical passages in them reflect that era. **Current status: the platform is live.** Supabase Postgres persists all operational data, Supabase Auth handles real accounts, and Anthropic Claude powers live inference (streaming HERNE specialist replies, the receptionist assessment, the admin playground). Still not connected, by design or pending client input: payments (subscription payments are manual records — no payment provider), outbound email (the only email sent is Supabase Auth's password-reset message), voice, embeddings/vector search (retrieval is ranked Postgres full-text), and wearable device integration (no device source is connected; the wearable pipeline is built and shows honest empty states).

## Reading order

| # | Document | What it covers |
| --- | --- | --- |
| 00 | [Overview](architecture/00-overview.md) | The platform architecture, layering, and the pre-production→production seam |
| 01 | [Authentication](architecture/01-authentication.md) | Roles, sessions, OAuth, API keys, middleware, protected routes |
| 02 | [Authorization / RBAC](architecture/02-authorization-rbac.md) | Permission catalogue, role matrix, overrides, guards |
| 03 | [Database](architecture/03-database.md) | Schema conventions, the 13 migrations, the ERD |
| 04 | [Row Level Security](architecture/04-rls-security-model.md) | The RLS model, policy patterns, append-only logs |
| 05 | [AI agent framework](architecture/05-ai-agent-framework.md) | Agents as data — unlimited agents without code changes |
| 06 | [Knowledge architecture](architecture/06-knowledge-architecture.md) | Documents → versions → chunks → embeddings, publishing workflow |
| 07 | [Memory architecture](architecture/07-memory-architecture.md) | Six cleanly-separated memory scopes |
| 08 | [Consultation workflow](architecture/08-consultation-workflow.md) | Intake → assessment → review → appointment → follow-up |
| 09 | [Admin foundation](architecture/09-admin-foundation.md) | The administration framework and its surfaces |
| 10 | [Security](architecture/10-security.md) | Headers, CSP, rate limiting, CSRF, uploads, errors, secrets |
| 11 | [Scalability](architecture/11-scalability.md) | Multi-org/clinic, i18n, voice, wearables, mobile, API |
| 12 | [Decision records (ADR)](architecture/12-decisions-adr.md) | The key decisions and why they were made |
| 13 | [AI Management Platform](architecture/13-ai-platform.md) | Agents, prompts, knowledge, playground, safety, memory, analytics — all DB-driven (Phase 3) |
| 14 | [Admin Portal & User Dashboard](architecture/14-admin-and-dashboard.md) | The admin portal, the reusable UI kit, and the member dashboard (Phase 3) |
| 15 | [The AI Business Lifecycle](architecture/15-ai-business-lifecycle.md) | Receptionist AI → Specialist AI products → AI-centric CRM → Administration (Phase 4) |
| 16 | [HERNE collaboration](architecture/16-herne-collaboration.md) | Referral matrix, one shared care plan, journey timeline, escalations |
| 17 | [HERNE wearable](architecture/17-herne-wearable.md) | Thryve-ready wearable layer — real pipeline, no device source connected yet |
| 18 | [HERNE website](architecture/18-herne-website.md) | The specialist institute experience (public + dashboard) |
| 19 | [HERNE multilingual](architecture/19-herne-multilingual.md) | Language preference model; voice remains planned |
| 20 | [HERNE admin](architecture/20-herne-admin.md) | Admin surfaces over the collaboration + wearable layers |
| 21 | [HERNE live AI](architecture/21-herne-live-ai.md) | Live Claude integration — streaming, safety, usage limits, cost tracking |

## Related

- [`db/README.md`](../db/README.md) — the database migrations, conventions and full ERD.
- [`db/storage.md`](../db/storage.md) — Storage bucket layout.
- The Phase-1 foundation plan (design system, marketing site) is captured in the product artifact.

## Phase boundaries

- **Phase 1** — marketing site, design system, stubbed services (shipped).
- **Phase 2** — the enterprise backend foundation (auth/RBAC, database + RLS, AI/knowledge/memory frameworks, admin, security). **No AI.**
- **Phase 3** — the AI management platform + admin portal + user dashboard (shipped): agent/prompt/knowledge management, playground, safety, memory, analytics — all DB-driven and admin-managed. No live AI at that stage (stubbed providers, "build once, configure forever").
- **Phase 4** — refocus the product around the customer journey (shipped): the **Receptionist AI** front door, **Specialist AI** subscription products, and an **AI-centric CRM**, reusing all Phase 2–3 infrastructure. Still on stubbed providers at that stage (no live AI/payments).
- **Phase 5** — the live AI experience (**shipped** — the HERNE increments, docs 16–21): real Claude inference with streaming replies, safety pre/post-checks, per-user usage limits and cost tracking, on real Supabase data and auth. Not yet done from the original Phase-5 scope: embeddings/vector search (retrieval is ranked Postgres full-text) and connected payments (subscription payments remain manual records).
