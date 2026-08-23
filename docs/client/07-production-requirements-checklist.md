# Production Requirements Checklist

A practical checklist of what must be in place to run the platform in production. Grouped by area.
Nothing in this list exposes secrets; specific keys and credentials are held securely by the
engineering team, never in client-facing documents.

---

## Clinical & safety
- [ ] Approved emergency wording (localised)
- [ ] Approved self-harm wording + crisis signposting (localised)
- [ ] Defined human clinical-review workflow (reviewers, SLA, audit trail)
- [ ] Escalation destinations connected to real people/channels
- [ ] Clinician sign-off on specialist scopes, boundaries and the shared evidence base
- [ ] Medical disclaimer + terms reviewed by legal/clinical governance

## AI provider & operations
- [ ] Client's own **Anthropic account** and production API key (config change only)
- [ ] Production model selected and pinned; fallback behaviour agreed
- [ ] Per-user daily/monthly usage limits set for production scale
- [ ] Budget + spend alerting on token cost
- [ ] Cost/usage dashboards available to the operations team
- [ ] Prompt versions reviewed and published; shared DNA finalised

## Wearables (Thryve)
- [ ] Thryve API credentials provisioned (`THRYVE_API_KEY`, `THRYVE_APP_ID`, `THRYVE_WEBHOOK_SECRET`)
- [ ] Thryve commercial agreement signed
- [ ] Contract-specific field mapping implemented in the provider adapter
      (everything else — lifecycle, callback, ingest, resync, deletion — is built;
      see `docs/integrations/thryve.md`)
- [ ] Consent, data-quality and permission model validated against live data

## Identity, accounts & access
- [ ] Production authentication (email verification, optional MFA — password reset already works)
- [ ] Role-based access verified for member / practitioner / administrator (+ any others)
- [x] Practitioner console built (assigned-case human review + case management; assignment checked server-side)
- [ ] Multi-organisation/tenant support (if required)
- [ ] Operational admin credentials rotated (the former fictional accounts are already deleted)

## Data protection & compliance
- [ ] Data Protection Impact Assessment (DPIA) completed
- [ ] Records of processing + data-retention policy (memory retention already modelled)
- [ ] GDPR data-subject flows: export, correct, delete, withdraw consent (memory controls exist)
- [ ] Real patient data only introduced under approved governance
- [ ] Clinical governance sign-off

## Security
- [ ] Independent security review + penetration test
- [ ] Secrets management verified (no secret ever reaches the browser or client documents)
- [ ] Rate limiting / abuse protection tuned for production
- [ ] Row-level security verified for every user-owned table
- [ ] Dependency and infrastructure hardening

## Commerce & communications
- [ ] Payment provider selected by the client; adapter implemented behind the existing
      provider seam (ledger, refund states, instalments and the webhook pipeline are built;
      payments stay manual admin records until then)
- [ ] Resend connected (`RESEND_API_KEY` + from/reply-to addresses) — every email workflow is
      built and queues into the outbox already
- [ ] Zoho mailboxes created on the final domain; the four business addresses set via env
- [x] Database migration **0031** applied 2026-08-23 (mail outbox, contact/newsletter storage,
      instalment schedules, webhook events, job runs) — verified live
- [ ] Database migration **0032** applied (private knowledge + conversation-attachment storage,
      attachment metadata/RLS and provider-neutral Remote Selfie Scan session lifecycle)
- [ ] `CRON_SECRET` set so the daily background-job run (reminders, outbox delivery, syncs)
      activates
- [ ] Voice keys supplied if voice is wanted at launch (`DEEPGRAM_API_KEY`,
      `ELEVENLABS_API_KEY`, `ELEVENLABS_DEFAULT_VOICE_ID`; per-specialist voices are set on
      /admin/integrations)

## Provider-dependent capabilities
- [ ] Approved Remote Selfie Scan provider selected and official API/webhook contract supplied;
      the application lifecycle and verified-provider seam are already built
- [ ] Embedding provider selected if vector retrieval is required; current ranked full-text
      retrieval remains live and production-functional without embeddings
- [ ] OCR provider selected if scanned/image-only knowledge PDFs must be ingested directly;
      text-based PDF/DOCX/TXT/CSV upload ingestion is already built

## Content & localisation
- [ ] Final approved marketing copy applied across the public site
- [ ] Product/brand name applied consistently
- [ ] Six specialist portraits + draft greetings/philosophy supplied
- [ ] Language review process for AI-generated translations (English = reference)
- [ ] Final pricing/subscription structure

## Platform & reliability
- [ ] Load & performance testing
- [ ] Backups + disaster recovery
- [ ] Monitoring, logging and alerting (per-call AI telemetry already captured)
- [ ] Staging environment separate from production
- [ ] Runbooks for on-call/operations

---

### Already in place from the application build (verify, don't rebuild)
Provider-neutral AI layer with streaming/cancellation/retry/typed errors · one shared evidence
base + multi-factor retrieval · runtime prompt assembly · fixed safety pre/post checks + enforced
admin-managed safety policies · 15-rule referral matrix · shared care-plan state machine ·
Thryve-ready wearable model with permissions/consent/AI access log · consent-gated memory with user
controls + audited admin governance · per-call token/cost/trace telemetry · secure knowledge file
extraction/indexing · private conversation-attachment application flow · dedicated practitioner
console · full admin portal (specialists, evidence, prompts, DNA, referrals, wearable, care plans,
escalations, Playground, usage/cost). Exactly **eight specialists** are enforced, with a generic
multi-agent framework so more can be added from the admin backend.
