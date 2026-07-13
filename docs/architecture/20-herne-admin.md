# HERNE Admin Surfaces

Gives administrators visibility and safe control over the multi-specialist layer —
the collaboration engines (referrals, care plans, escalations) and the wearable
foundation — without touching the runtime that produces those rows.

## Routes (all under `/admin/herne`, administrator-gated by the `(admin)` layout)

| Route | Purpose |
|---|---|
| `/admin/herne` | Overview hub — live counts (specialists, evidence, referral rules, care plans, referrals, escalations, wearable metrics, AI access logs), the specialist roster, and links to every surface. |
| `/admin/herne/referrals` | The client referral matrix (rules), the live referral log, and human escalations. |
| `/admin/herne/care-plans` | The one-shared-plan-per-person list — status, contributing specialists, goals, action counts. |
| `/admin/herne/wearable` | Metric catalogue, the specialist × metric **access matrix**, consents, and the AI access log. |
| `/admin/herne/dna` | **Editable** shared DNA — the one collaboration-layer write. |

Existing surfaces are linked, not rebuilt: **Specialist profiles** → `/admin/specialists`,
**Prompt versions** → `/admin/ai/prompts`.

## Read model

`src/services/herne/admin.ts` (server-only) reads everything org-scoped
(`organisation_id = HERNE_ORG`) via the admin client:

- `herneAdminOverview()` — parallel `count`s across the collaboration + wearable
  tables; returns `configured: false` (all zeros) when Supabase is absent so pages
  render an honest banner rather than erroring.
- `listReferrals` / `listEscalations` / `listCarePlans` / `listWearableCatalog` /
  `listConsents` / `listAiAccessLogs` — bounded, newest-first lists mapped to typed
  view models. Person ids are shown truncated for privacy.

## The one write: shared DNA

`getSharedDna()` / `setSharedDna()` read+write `system_settings`
(`key = herne_shared_dna`), the same value the runtime prompt assembler
(`reply.ts → sharedDna()`) reads. `SharedDnaEditor` (client) + `saveSharedDnaAction`
(`admin-actions.ts`, `assertRole('administrator')`) let an admin add/remove/edit the
values; `setSharedDna` trims, drops empties, and never persists an empty list
(falls back to the bundled default). Saving revalidates `/admin/herne/dna` and
`/specialists`.

Everything else is **read-only** by design: referrals, care plans, escalations,
consents, measurements and AI access logs are produced by the runtime engines, so
the admin views observe them rather than fabricate them.

## Honesty

- Live Thryve is not connected — wearable figures come from the mock adapter, stated
  on the overview and wearable pages.
- When the DB is unconfigured, the overview shows a banner and zeros (no invented
  data).
- The access matrix is derived from the catalogue's `specialist_access` (already
  expanded from rules like "All except Felix"), so it reflects the client's permitted
  use, not an assumption.
