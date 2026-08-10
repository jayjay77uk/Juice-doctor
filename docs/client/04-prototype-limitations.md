# Prototype Limitations

This is a **demonstration prototype**. It shows the intended product experience end-to-end, but a
number of capabilities are deliberately mocked, planned, or interim. This document lists every
material limitation so nothing is over-claimed during the demonstration.

---

## Data & clinical safety
- **No real patient data.** All members, cases and history are fictional or anonymised
  demonstration data.
- **Not a clinical service.** Specialists provide general wellbeing support only. They do not
  diagnose, prescribe, or replace a qualified healthcare professional.
- **AI replies are not clinically reviewed.** Responses are generated live by the Anthropic Claude
  model, grounded in the approved evidence base, but have **not** been reviewed by a clinician.
- **Emergency & self-harm wording is interim.** The safety pathway works (it triggers before any AI
  runs), but the exact wording shown is placeholder copy pending client-approved clinical language.

## Wearables
- **Wearable data is simulated.** The live **Thryve** connection is **not** enabled. All wearable
  trends are produced by a mock adapter with fixed demonstration values.
- Specialists only ever see **permitted, minimised trend summaries** — never raw history, and never
  presented as a diagnosis. This access model is real; only the data source is simulated.

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

## Functional scope (prototype-only behaviours)
- A few member/admin controls are demonstration-only and are clearly disabled/labelled (e.g.
  "Edit profile", "Invite user"). The underlying data they display is real.
- File attachments in chat are a stub (nothing is uploaded/stored).
- A dedicated **practitioner console** is not built; the practitioner role uses the member dashboard
  with staff-level visibility.
- Payments and email sending are **not** connected — no live payment provider (subscription
  payments are recorded manually), and the only email the platform sends is the password-reset
  message. Member bookings are stored as real records in the platform database, but no confirmation
  email is sent; the public marketing booking form is a declared mock and sends nothing.
- Usage limits and concurrency guards exist but are tuned for a prototype, not production scale.

## Environment
- Runs on a single prototype environment; not load-tested or security-hardened for production.
- The prototype uses a single demonstration organisation/tenant.
