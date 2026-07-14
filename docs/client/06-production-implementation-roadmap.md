# Production Implementation Roadmap

A phased path from the current prototype to a production wellbeing platform. Phases are ordered so
that clinical safety and the client's own accounts come first. Timings are indicative and depend on
the outstanding client approvals.

---

## Phase 0 — Client sign-off & assets (prerequisite)
- Approve the emergency, self-harm and clinical-review wording (Approvals 1–3).
- Supply the six remaining specialist portraits, Makela's philosophy and the four greetings
  (Approvals 4–9).
- Confirm supported languages, the voice decision, and the brand/marketing copy.
- **Exit:** all `awaiting client approval` items resolved or explicitly deferred.

## Phase 1 — Clinical safety hardening
- Replace interim emergency/self-harm copy with approved clinical wording and localise it.
- Implement the client's human-review workflow (who reviews, SLA, audit trail) and connect the
  escalation destinations to real people/channels.
- Independent clinical review of specialist scopes, boundaries and the shared evidence base.
- **Exit:** safety pathway signed off by a clinician; escalations reach real reviewers.

## Phase 2 — Client-owned Anthropic account & AI operations
- Move to the **client's own Anthropic account and API key** (a configuration change — no code
  changes required; see the Requirements Checklist).
- Set production usage limits, budgets and alerting on token spend.
- Turn on cost/usage dashboards for the client operations team.
- **Exit:** all AI runs on the client's account with production limits and monitoring.

## Phase 3 — Live wearables (Thryve)
- On receipt of Thryve credentials and the commercial agreement, connect the real Thryve adapter
  behind the existing wearable data model (built to be Thryve-ready).
- Validate consent, data-quality flags, permissions and the AI-access log against live data.
- **Exit:** real wearable trends flow through the same permission/consent model, replacing the mock.

## Phase 4 — Accounts, identity & practitioner console
- Production authentication hardening (email verification, password reset, MFA options).
- Build the dedicated **practitioner console** for human review, sign-off and case management.
- Multi-organisation/tenant support if required.
- **Exit:** members, practitioners and admins each have a production-grade surface.

## Phase 5 — Commerce & communications
- Connect real subscriptions/payments (no live payment processing exists today).
- Connect transactional email/notifications and booking flows.
- **Exit:** the commercial lifecycle (subscribe → access → follow-up) runs on live services.

## Phase 6 — Voice (optional, if approved)
- Integrate the approved speech provider for voice input/output behind the existing
  voice-capability model (currently labelled "planned").
- **Exit:** voice conversations available where approved.

## Phase 7 — Scale, compliance & launch
- Security review and penetration testing; data-protection/DPIA and clinical governance sign-off.
- Load testing, performance tuning, backups/disaster recovery, observability.
- Content localisation review for each supported language.
- **Exit:** production launch readiness.

---

### What carries straight over from the prototype
The core architecture is production-shaped and reused as-is: the provider-neutral AI layer, the
one-shared-evidence retrieval + ranking, the runtime prompt assembly, the referral matrix, the
shared care-plan state machine, the wearable data model (Thryve-ready), the consent-gated memory,
per-call telemetry (tokens/cost/trace), and the full admin portal. Production work is largely
*connecting live services and hardening*, not rebuilding.
