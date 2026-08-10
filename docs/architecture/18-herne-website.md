# HERNE Specialist Website Experience

Presents the eight specialists as a **private wellbeing institute** — one
coordinated team, one shared care plan, one journey — not eight disconnected
chatbots. Does not touch the intelligence, referral, care-plan or wearable layers.

## Routes

| Route | Purpose |
|---|---|
| `/specialists` | Premium institute page: hero, multilingual/voice statement, shared DNA, coordinated-care explanation, eight cards, collaboration journey, CTAs, safety notice. |
| `/specialists/[slug]` | Per-specialist page (8, statically generated): portrait hero, opening, "How I can help", can/cannot do, team collaboration, HERNE priorities, wearable summary, closing, CTAs. |
| homepage | Brief Makela-first specialist section (all eight, "View all", "Ask Makela"). |
| `/dashboard/specialists` | "My Specialists": concierge, contributing specialists, latest interaction, referral status, links to the shared care plan. |

## Content model (structured, never hardcoded in components)

- `src/data/herne/specialist-experience.ts` — client experience copy (opening,
  intro, How I Can Help, closing, portrait, approval flags) from the "Agent
  Description and Roles" document, verbatim.
- `src/data/herne/website-profiles.ts` — merges role/scope config + experience
  copy into one `WebsiteProfile`; pages render from `websiteProfiles()`.
- Shared DNA + multilingual statement come from the same config.

## Portrait management

The client supplied a **hero card + finished portrait cards for Makela and
Serena** (`public/specialists/{hero,makela,serena}.png`, originals also in
`docs/assets/herne-portraits/`). Portraits are used **as supplied** — never
regenerated. The other six specialists have **no portrait**, so they use an
elegant navy + gold monogram card and are flagged `awaiting_client_approval`.

## Makela entry-point journey

Makela is presented as the concierge and default start. "Ask Makela to guide me"
appears in the hero, homepage, each specialist page and the member dashboard, and
routes into the existing `/assistant` conversation journey.

## Shared DNA + collaboration presentation

The DNA section lists the eight shared values and explains the one shared evidence
base + one care plan. The collaboration section renders the journey visually:
Makela → your specialist → supporting specialist → shared care plan → Makela
follow-up → human practitioner when required.

## Multilingual + voice readiness

The approved statement is shown near the top of the experience, with "voice or
text", "multiple languages" and "regional dialect support" — labelled honestly:
text conversations and language support are live (language replies are
AI-generated, not human-reviewed; English is the reference version), while voice
is **planned**, not live. The language-preference model + future hooks are
preserved.

## Design direction

Premium, calm, private, high-end, clinical-but-warm: dark navy (`#0a1420`) grounds,
gold (`#c9a961`) accents, a gold lotus emblem and a serif display face for names —
matching the client's supplied cards.

## Accessibility

Semantic headings, portrait alt text (name + title), keyboard-navigable links,
visible focus rings (`focus-visible:ring`), responsive grids, sufficient contrast.

## Current limitations / awaiting client

- Six specialist portraits are pending — monogram placeholders, flagged.
- Voice is planned, not live; language replies are AI-generated and not
  human-reviewed for clinical accuracy (English is the reference version).
- Sage/Luca/Felix/Optimus greetings and Makela's philosophy remain draft
  (awaiting client approval), surfaced with a visible label.
