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
- [ ] Thryve API credentials provisioned
- [ ] Thryve commercial agreement signed
- [ ] Live Thryve adapter connected behind the existing data model
- [ ] Consent, data-quality and permission model validated against live data
- [ ] "Wearable data is simulated" notices removed once live

## Identity, accounts & access
- [ ] Production authentication (email verification, optional MFA — password reset already works)
- [ ] Role-based access verified for member / practitioner / administrator (+ any others)
- [ ] Practitioner console built (human review + case management)
- [ ] Multi-organisation/tenant support (if required)
- [ ] Demo accounts disabled or rotated

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
- [ ] Live subscriptions/payments provider connected (no live payments today)
- [ ] Transactional email/notifications connected
- [ ] Booking confirmations/notifications connected (booking records are already stored in the
      platform database)

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

### Already in place from the prototype (verify, don't rebuild)
Provider-neutral AI layer with streaming/cancellation/retry/typed errors · one shared evidence
base + multi-factor retrieval · runtime prompt assembly · safety pre/post checks · 15-rule referral
matrix · shared care-plan state machine · Thryve-ready wearable model with permissions/consent/AI
access log · consent-gated memory with user controls · per-call token/cost/trace telemetry · full
admin portal (specialists, evidence, prompts, DNA, referrals, wearable, care plans, escalations,
Playground, usage/cost). Exactly **eight specialists** are enforced, with a generic multi-agent
framework so more can be added from the admin backend.
