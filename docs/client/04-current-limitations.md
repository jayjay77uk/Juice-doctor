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
  enabled, and no data source of any kind is attached — wearable surfaces show honest empty
  states. The architecture (metric catalogue, per-specialist permissions, consents, AI-access
  log) is ready for the live connection.
- When connected, specialists will only ever see **permitted, minimised trend summaries** — never
  raw history, and never presented as a diagnosis.

## Voice & language
- **Voice conversations are planned, not connected.** Voice input/output is labelled "planned"
  throughout; no speech provider is integrated.
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

## Functional scope (not yet implemented)
- **No email provider.** The public contact, newsletter and marketing booking forms return an
  honest "not available yet" message; no verification email is sent at registration; the only
  email the platform sends is the password-reset message.
- **No payments provider.** Subscription payments are recorded manually; no online payment is
  taken through the platform. Member bookings are stored as real records, but no confirmation
  email is sent.
- **Remote Selfie Scan is not yet available** — the page says so honestly.
- **Knowledge ingestion is pasted text only.** File-upload ingestion, vector embeddings and
  question clustering are not implemented (retrieval runs on ranked full-text search).
- **Some admin capabilities are pending**: memory browsing (the admin memory page shows real
  counts only) and user invitations are not implemented and are labelled accordingly.
- File attachments in chat are not supported (nothing is uploaded/stored).
- A dedicated **practitioner console** is not built; practitioner-facing review happens through
  the roadmap's later phases.
- **Error/product monitoring (Sentry/PostHog) is not connected.**
- Usage limits and concurrency guards exist but are tuned conservatively, not yet for full
  production scale.

## Environment
- Runs on a single environment; independent load-testing and security hardening for full
  production scale are still on the roadmap.
- The platform runs as a single organisation/tenant today.
