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

Registration/onboarding reconciliation and email confirmation; consent withdrawal
and practitioner sharing; complete paginated exports; reviewed knowledge bridging;
care-plan proposal tools; context-preserving handoffs; human-support confirmations;
Journal; journey selection; programme delivery and progress; 15-minute audio-call
booking; regenerate and stopped-message persistence; multilingual/full-length voice;
user administration; follow-up jobs; runtime feature flags/readiness; approved public
content and updated client handover documentation.

Publication reconciles this rebuilt batch against remote main `06b8142`, preserving
its history and all unchanged files. The batch includes the complete, install-tested
lockfile to replace the truncated remote copy. The reconstructed local history must
not be force-pushed; publication uses a new child commit of remote main.

No live Supabase migration, account change, payment, provider call, or deployment
was performed in this recovery batch. Live acceptance testing remains outstanding.
