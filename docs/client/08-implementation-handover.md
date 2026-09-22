# Implementation handover — 22 September 2026

This document supersedes earlier statements that the platform was fully delivered
or production-verified. Code completion and live acceptance are separate.

## Completed in this release

| Workflow | Operation | Important boundary |
| --- | --- | --- |
| Programmes | Staff create/edit draft details and modules, review, publish/unpublish, assign members, pause/cancel/resume access | Published or enrolled curricula cannot be edited; create a new version |
| Member learning | Assigned published modules, mark complete/incomplete, stored percentage and completion date | Server-only progress transaction; no self-enrolment or forged percentages |
| Public catalogue | Published database programmes with enquiry links | No sample programme sales or simulated checkout |
| Permission overrides | Owner grants/denies/restores role defaults with reason and optional UTC expiry | No self/owner edits, cross-organisation access or delegation of denied permissions |
| Follow-ups | Opt-in daily and weekly dashboard reminders, weekly email check-ins, due/overdue instalment reminders | Stable dedupe keys; verified active recipients; opted-out and paid reminders blocked at dispatch |
| Runtime controls | AI inference, scan initiation and notification delivery gates | Safety responses remain available; failed flag reads disable runtime capabilities |
| Unconnected controls | Vector search, checkout and live availability show unavailable | Buttons cannot enable a capability that has no implementation/provider |

The preceding release includes journals, journey focus, handoff acceptance,
human-takeover controls, care-plan proposals, consent controls, chat regeneration,
support confirmations and complete read-aloud within the 10,000-character ceiling.

## Deployment steps

1. Confirm the Supabase project belongs to **Ask Juice Doctor**. The available
   connector on 21 September exposes only **MN LUXE HOME**; no migration was run there.
2. Review migration history and apply missing files from `db/migrations` in order.
   In particular, the new delivery migration is
   `20260921073825_programme_delivery.sql`. Earlier Journal/Journey and care-proposal
   migrations also remain unverified live. Back up the target database first.
3. Deploy the latest `main` through the existing Vercel workflow.
4. Review `/admin/config`. An existing `ai.chat=false` is now enforced. Enable it
   intentionally if AI should run. Enable `platform.notifications` only when
   delivery is ready. Unsupported controls remain unavailable.
5. Confirm email verification and the production `/auth/callback` allowlist.
6. Confirm `CRON_SECRET`; the existing daily schedule calls `/api/jobs/run` at
   07:00 UTC. New jobs use this existing authenticated runner. No scheduler was
   triggered during implementation.
7. Configure approved providers last. Anthropic alone may incur usage charges.
   All other providers require verified free allowance and disabled overages.
   There is no paid fallback. Resend/Zoho/domain activation is still a connection task.
8. Create approved programme content and assign a test member. No curriculum,
   testimonials, legal wording or clinical approvals were fabricated.

## Acceptance checks on the correct project

- Register with confirmation enabled; verify the email and callback; sign in.
- Create a draft programme with two modules. Confirm it is hidden publicly and
  from unassigned members. Publish it and assign the test member.
- Complete one module: progress is 50%. Complete both: 100% and completed.
  Repeat completion: no duplicate. Undo one: 50% and active.
- Pause/cancel access; verify modules are inaccessible. Restore access and verify
  saved progress. Unpublish and confirm public/member module access stops.
- As the owner, deny a subordinate permission and verify the next request is
  denied. Restore the role default; test expiry. Self/owner/cross-org changes fail.
- Opt into follow-ups, run the job twice, and verify one record per recipient and
  period. Opt out before outbox delivery; verify no check-in is sent. Mark an
  instalment paid before dispatch; verify its pending reminder is suppressed.
- Disable AI: ordinary inference stops, while emergency guidance remains available.
  Disable notifications: no provider mail dispatch or new member follow-ups.
- Verify live provider calls respect the free-allowance policy and show genuine
  unavailable states when configuration or quota checks fail.

## Verification and limits

- Automated suite: 250 tests; type-check and lint passed. Database fixtures use
  embedded PostgreSQL to exercise programme RLS, transaction idempotency,
  curriculum protection and rejection paths.
- Final production build passed on 22 September after rebuilding a corrupted
  local build cache. HTTP smoke checks confirmed the public catalogue's honest
  unavailable state without a database, and login redirects (without protected
  forms) for both member and admin programme routes.
- Browser verification was attempted but blocked: agent-browser could not start;
  Playwright had no browser installed and Chromium download returned HTTP 502.
  Authenticated UI and end-to-end production acceptance remain unverified.
- No production migration, account mutation, paid call, outbound message, payment
  or manual deployment was performed.
- Human takeover pauses subsequent requests; an already-running AI generation is
  not cancelled atomically. Existing audit writes are best-effort. These are known
  limitations, not claims of stronger guarantees.
- Checkout, live availability and vector retrieval remain unavailable until their
  implementations/provider decisions are approved. Existing FTS knowledge,
  appointment requests and manual payment records remain the supported paths.
- Final client-approved public/clinical/legal content and live provider mapping
  are still required. The code release does not establish clinical readiness.
