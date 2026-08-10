# Thryve wearable integration — final-connection checklist

Application-side development is COMPLETE. The platform never simulates a
device: until the three credentials below exist, connections are honestly
unavailable, the webhook answers 503, and no measurement can enter the system.

## What is already built (and how it gates)

| Piece | Where | Gate |
| --- | --- | --- |
| Provider seam (create/fetch/verify/parse/revoke) | `src/services/herne/wearable/provider.ts` | `getWearableProvider()` returns null until credentialed |
| Consent ledger + per-specialist metric permissions | `wearable_consents`, `wearable_metric_catalog` (applied live) | consent checked on EVERY ingest |
| Idempotent ingest engine (validation, duplicate protection, quality flags, trend recompute, sync-job records) | `src/services/herne/wearable/ingest.ts` | refuses without consent |
| Webhook receiver (size cap, signature check, parse → ingest) | `/api/webhooks/thryve` | 503 until configured |
| Authorisation callback (signed HMAC state, 15-min expiry, pending→active) | `/api/wearables/thryve/callback` | 503 until configured |
| Member connect / disconnect UI (disconnect revokes consent + DELETES data) | `/dashboard/connected-health` | connect disabled until configured |
| Admin: provider state, member connections, staff resync, sync jobs | `/admin/herne/wearable` | resync errors honestly until configured |
| Scheduled sync + failed-sync retry | `/api/jobs/run` (background jobs) | skipped until configured |

## Credentials required (from the client's Thryve contract)

```
THRYVE_API_KEY=
THRYVE_APP_ID=
THRYVE_WEBHOOK_SECRET=
```

## CONTRACT-REQUIRED work at connection time (isolated by design)

All of it lives in ONE file — `src/services/herne/wearable/provider.ts` — as
the adapter returned by `getWearableProvider()`. Everything else already works
against the interface. Do NOT invent response fields; implement from the
official Thryve API documentation:

1. `createConnection` — mint the member session/connection and build the
   authorisation URL (append our signed `state` from
   `createConnectState(userId)`).
2. `fetchMeasurements` — map Thryve's data-type codes to our metric catalogue
   slugs; emit `RawMeasurement[]` for the ingest engine.
3. `verifyWebhook` / `parseWebhook` — implement Thryve's actual signature
   scheme and payload shape.
4. `revokeConnection` — provider-side revocation call.
5. If Thryve issues per-user tokens that must persist, store them in
   `wearable_provider_tokens` (migration 0031) — ciphertext only, encrypted
   app-side with `TOKEN_ENCRYPTION_KEY` (add the variable then; it does not
   exist before it is needed).

## Verification commands (after credentials are set)

```bash
# Webhook goes from 503 to 401 (signature required) once configured:
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<host>/api/webhooks/thryve -d '{}'
# Callback rejects an invalid state with 401 once configured:
curl -s -o /dev/null -w '%{http_code}\n' 'https://<host>/api/wearables/thryve/callback?state=bad'
```

Then: member connects on /dashboard/connected-health → authorise → status
"Connected" → staff Resync on /admin/herne/wearable ingests real measurements →
trends appear for the member and (permission-filtered) in specialist context →
disconnect deletes the data (verify the count in the audit log).
