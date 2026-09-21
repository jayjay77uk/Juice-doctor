# Audit implementation recovery — 15 September 2026

The earlier uncommitted implementation directory was lost when the workspace
disconnected. Its historical verification does not apply to this restored checkout.
This document records only rebuilt work.

## Rebuilt and committed

- `9d10620`: detected unsupported diagnoses are replaced before returning an
  answer; raw HERNE deltas are withheld until final safety review; emergency
  handling runs without an AI provider and takes precedence over configured
  topic boundaries. Added provider-free regression tests.
- `5ead268`: subscription self-activation and plan changes require the designated
  test account; ordinary members must use administrator-approved access. Corrected
  the test email suffix to 8204. Disabled specialists reject conversation creation
  and existing-thread requests.
- Test recovery: provider adapter tests use mocked allowance reservations and
  explicitly verified test-only policies. Production spending guards are unchanged.
  Empty tool schemas no longer add phantom input tokens. Pricing arithmetic tests
  use the existing Sonnet 4 fixture; no production pricing rates were changed.

## Still pending

Programme delivery and progress; user administration UI; follow-up producers; runtime feature-flag consumers;
approved public content and final client handover documentation. Flag persistence
and readiness reporting are fixed, but this does not mean every flag has a consumer.

## Subsequent implementation checkpoints

- `87e0289` on remote main: server-action subscription/usage/consent checks;
  generic-agent safety boundaries; confirmation-based registration with callback
  and organisation provisioning; invited-user organisation/error handling;
  suspended/deactivated/missing-profile session rejection and permission overrides;
  ownership-scoped paginated exports; consent grant/withdrawal history and
  practitioner-sharing gates; honest readiness status and flag-save errors;
  15-minute Audio Call requests through the authenticated booking workflow.
- Journal: create, edit, archive, paginated history and account export; private by
  default (not automatically shared with AI/practitioners). Owner-only database
  policies exercised in embedded PostgreSQL. Migration:
  `20260915215959_member_journal_and_journey.sql` — NOT applied to live Supabase.
- Journey: saved wellbeing focus, selection UI and consent-gated specialist context.
- Chat: regeneration reuses the stored user turn without inserting a duplicate;
  idle polling refreshes care-team replies and pending support confirmations;
  support confirmation/decline checks ownership, live bindings and entitlements,
  and atomically claims a pending request before executing it.
- Knowledge: HERNE includes assigned published documents; shared evidence excludes
  unreviewed states; new/replaced uploads require publication before live retrieval.
- Care-plan proposals: an agent tool creates proposed (not accepted) actions;
  clinical wording and unknown evidence references are rejected. Migration
  `20260920235319_care_plan_proposal_tool.sql` is NOT applied live.
- Handoffs: explicit member acceptance checks consent, ownership, active specialist
  and subscription; context is stored with the destination conversation. Context
  reads recheck both owners and consent, exclude system messages and are bounded.
- Human takeover: staff replies pause subsequent AI requests until explicitly
  returned to AI; member replies remain available and are polled by the chat UI.
  An already-running generation is not cancelled atomically by takeover.
- Voice: recorded speech uses language detection instead of forced English.
  Read-aloud assembles complete replies up to 10,000 characters in bounded chunks;
  it reserves the entire free allowance first and returns an error, not partial
  audio, on synthesis failure or excess length. No live voice calls were made.

Verification on 21 September: 226 tests passed, including journal RLS in embedded
PostgreSQL, handoff privacy checks and complete-audio/error-path tests.

Deployment prerequisites: apply the Journal/Journey migration to the correct
Juice Doctor project, enable Supabase email confirmation, allow the production
`/auth/callback` URL, and verify registration/email delivery and authenticated
flows against that project. No live provider calls or production database writes
were used to verify these checkpoints. Build/tests do not replace live acceptance.

Publication reconciles this rebuilt batch against remote main `06b8142`, preserving
its history and all unchanged files. The batch includes the complete, install-tested
lockfile to replace the truncated remote copy. The reconstructed local history must
not be force-pushed; publication uses a new child commit of remote main.

No live Supabase migration, account change, payment, provider call, or deployment
was performed in this recovery batch. Live acceptance testing remains outstanding.
