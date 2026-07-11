# Prototype AI — Architecture documentation

The complete backend & platform architecture for the Prototype AI platform, produced in **Phase 2**. Everything here is designed exactly as it would exist in production, even though the prototype runs on typed mock providers and a paper database — **no AI, no live data, no payments**.

## Reading order

| # | Document | What it covers |
| --- | --- | --- |
| 00 | [Overview](architecture/00-overview.md) | The platform architecture, layering, and the prototype→production seam |
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

## Related

- [`db/README.md`](../db/README.md) — the database migrations, conventions and full ERD.
- [`db/storage.md`](../db/storage.md) — Storage bucket layout.
- The Phase-1 foundation plan (design system, marketing site) is captured in the product artifact.

## Phase boundaries

- **Phase 1** — marketing site, design system, mock services (shipped).
- **Phase 2** — the enterprise backend foundation (auth/RBAC, database + RLS, AI/knowledge/memory frameworks, admin, security). **No AI.**
- **Phase 3** — the AI management platform + admin portal + user dashboard (shipped): agent/prompt/knowledge management, playground, safety, memory, analytics — all DB-driven and admin-managed. **Still no live AI** (mocked, "build once, configure forever").
- **Phase 4** — refocus the product around the customer journey (shipped): the **Receptionist AI** front door, **Specialist AI** subscription products, and an **AI-centric CRM**, reusing all Phase 2–3 infrastructure. Still mocked (no live AI/payments).
- **Phase 5** — implement the live AI experience on this platform (real inference, pgvector embeddings/vector search, connected services & payments).
