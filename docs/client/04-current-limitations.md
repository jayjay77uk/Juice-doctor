# Current Limitations

The platform is live, but a number of capabilities are deliberately not yet connected, planned,
or interim. This document lists every material limitation so nothing is over-claimed.

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
- **Safety-policy records are stored, not yet enforced at inference.** Admin-managed safety
  policies are persisted, but wiring them into live inference is outstanding; the built-in
  pre/post safety checks are what runs today.

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
  connected. The public contact/newsletter forms additionally need database migration 0031
  before they store submissions; until then they show an honest "not available yet" notice.
- **No payments provider.** The payment ledger, refund states and instalment-schedule
  architecture are live application-side, but every payment is an admin-recorded manual entry;
  no online payment is taken and nothing is ever marked paid automatically. Instalment
  schedules require database migration 0031.
- **Database migration 0031 is written but not applied** (a fresh Supabase management token is
  needed). Until applied: mail outbox, contact/newsletter storage, instalment schedules,
  webhook-event storage and job-run history degrade honestly as described above.
- **Remote Selfie Scan is not yet available** — the page says so honestly.
- **Knowledge ingestion is pasted text only.** File-upload ingestion and vector embeddings are
  not implemented (retrieval runs on ranked full-text search). Popular-question clustering is
  live (deterministic clustering over real usage).
- **Admin memory browsing** remains counts-only. User invitations ARE now available (account +
  one-time password-setup link; the invitation email queues until Resend is connected).
- File attachments in chat are not supported (nothing is uploaded/stored).
- A dedicated **practitioner console** is not built; practitioner-facing review happens through
  the roadmap's later phases.
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
