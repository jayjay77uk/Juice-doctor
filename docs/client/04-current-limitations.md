# Current Limitations

The platform is live, but a number of capabilities are deliberately not yet connected, depend on
client/provider decisions, or require production-governance work. This document lists every material
limitation so nothing is over-claimed.

---

## Data & clinical safety
- **Not a clinical service.** Specialists provide general wellbeing support only. They do not
  diagnose, prescribe, or replace a qualified healthcare professional.
- **Not for emergencies.** In an emergency, contact local emergency services; the platform's
  safety pathway blocks AI replies on emergency wording, but it is not an emergency service.
- **AI replies are not clinically reviewed.** Responses are generated live by the Anthropic Claude
  model, grounded in the approved evidence base, but have **not** been reviewed by a clinician.
- **Emergency & self-harm wording is interim.** The safety pathway works (it triggers before any AI
  runs), but the exact wording shown is placeholder copy pending client-approved clinical language.
- **Admin-managed safety policies are now enforced at inference.** Active organisation policies and
  explicitly assigned specialist policies are injected into both normal and streaming HERNE turns.
  They are additive to the fixed emergency, diagnosis, medication and evidence safety floor, so an
  admin policy cannot disable those hard checks.

## Wearables
- **No wearable device integration is connected.** The live **Thryve** connection is **not**
  enabled, and no data source of any kind is attached — wearable surfaces show honest
  "not connected" states. The application side is **development-complete** (connection
  lifecycle, authorisation callback, consent-checked idempotent ingest, staff resync,
  disconnect-with-deletion, scheduled sync); only the Thryve credentials and the
  contract-specific field mapping remain (see `docs/integrations/thryve.md`).
- When connected, specialists will only ever see **permitted, minimised trend summaries** — never
  raw history, and never presented as a diagnosis.

## Voice & language
- **Voice is built but not connected.** Microphone capture, transcription and read-aloud are
  fully implemented application-side (Deepgram + ElevenLabs adapters, per-specialist voice
  configuration); the controls show an honest "not available yet" state until the two provider
  keys are supplied.
- **Multilingual replies are AI-generated.** A person can choose a language and specialists reply in
  it, but these translations are not human-reviewed. **English is the reference version.**
- **Regional dialect fidelity is planned.** A dialect preference can be expressed but is not
  separately verified.

## Content awaiting client approval
- **Six of eight specialist portraits** are pending — those specialists use an elegant monogram card
  and are flagged *portrait to follow*.
- **Makela's philosophy** and the **Sage, Luca, Felix and Optimus greetings** remain draft and are
  visibly labelled *awaiting client approval*.
- Marketing copy across the public site uses neutral placeholder wording where the client has not yet
  supplied final approved text.

## Functional scope
- **Email is built but no provider is connected.** Every email workflow (contact copy,
  newsletter welcome, account welcome, invitations, appointment lifecycle + reminders,
  follow-up alerts, escalation alerts, subscription changes, payment receipts) composes and
  records into a mail outbox; nothing sends — and nothing claims to have sent — until Resend is
  connected. The public contact/newsletter forms store submissions and the email copy waits in the
  outbox.
- **No payments provider.** The payment ledger, refund states and instalment-schedule
  architecture are live application-side, but every payment is an admin-recorded manual entry;
  no online payment is taken and nothing is ever marked paid automatically.
- **Database migration 0031 is applied** (2026-08-23) — mail outbox, contact/newsletter storage,
  instalment schedules, webhook-event storage and job-run history are live.
- **Remote Selfie Scan is application-complete but provider-unconnected.** The provider-neutral
  session lifecycle, authenticated launcher and signature-verifying webhook seam are implemented.
  No vendor contract is invented; the launcher remains disabled until an approved provider adapter
  is connected.
- **Knowledge file ingestion is implemented** for text-based PDF, DOCX, TXT and CSV files, with
  server-side type/signature validation and immediate retrieval indexing. Scanned/image-only PDFs
  still require an OCR provider or approved pasted text. Retrieval remains ranked full-text search;
  vector embeddings require a separate embedding-provider decision.
- **Admin memory governance is live.** Administrators can inspect recent stored memories and remove
  an incorrect/inappropriate memory; browse/delete actions are audit-logged without retaining a copy
  of deliberately erased content. Member self-controls remain primary.
- **Conversation file attachments are implemented** as private, ownership-checked files with signed
  downloads, validation, deletion and audit events. Attachments are deliberately **not** silently fed
  into AI context.
- **A dedicated practitioner console is implemented** for assigned-case review, immutable notes and
  approve/request-changes decisions. Practitioner mutations are assignment-checked server-side.
- **Migration 0032 is applied** (2026-08-29) — the private knowledge/attachment storage buckets,
  attachment metadata and selfie-scan session tables are live (verified: RLS on, read-only
  policies, private buckets with size limits).
- **Error/product monitoring (Sentry/PostHog) is built but not connected** — the capture layer
  and content-free event taxonomy are in place; without keys, errors log server-side only.
- **Background jobs** (reminders, outbox delivery, scheduled sync) are implemented with a daily
  Vercel cron declared; the runner stays honestly unavailable until `CRON_SECRET` is set.
- The **/admin/integrations** page shows the real connection state of every provider and exactly
  what each needs.
- Usage limits and concurrency guards exist but are tuned conservatively, not yet for full
  production scale.

## Environment
- Runs on a single environment; independent load-testing and security hardening for full
  production scale are still on the roadmap.
- The platform runs as a single organisation/tenant today.
