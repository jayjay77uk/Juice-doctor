# HERNE Multilingual & Voice Interaction Model

Lets a person choose the language their specialists speak with them, register a
regional-variety preference, and register interest in voice — while being **honest**
about what is live today versus planned. One shared evidence base and one
care plan are unchanged; only the language of the conversation changes.

## Honest capability split

The single source of truth is `HERNE_CAPABILITIES` in
`src/services/herne/language.ts`. Every surface reads its status/label/note from
there, so the UI can never drift from reality.

| Capability | Status | What it means |
|---|---|---|
| Text conversations | **live** | Chat with any specialist by text works now. |
| Preferred language | **live** | Specialists reply in the chosen language via the AI. Replies are AI-generated, **not** human-reviewed for clinical accuracy; English is the reference version. |
| Regional dialects | **planned** | A dialect preference can be expressed; separately verified dialect coverage is not live. |
| Voice conversations | **planned** | Voice input/output is not connected. The settings toggle is disabled and labelled *Planned*. |

Voice + verified dialect coverage are **never** presented as final — they are
labelled planned wherever they appear (`/specialists` hero, the languages band,
the settings card), and language replies always carry the AI-generated /
not-human-reviewed note.

## Model (pure, unit-tested)

- `src/data/herne/languages.ts` — the supported-language **catalogue** (`code`,
  `englishName`, `nativeName`, `rtl`, `dialects[]`). English first; extending needs no
  migration. Helpers: `herneLanguage`, `resolveLanguageCode`, `isRtlLanguage`.
- `src/services/herne/language.ts` — the `LanguagePreference` type, the capability
  model, `resolveLanguagePreference` (validates untrusted input: unknown language →
  default, dialect kept only if it belongs to the language, voice coerced to boolean),
  and `languageDirective` (the prompt instruction).

## Persistence

`src/services/herne/language-store.ts` stores the preference on the existing
`user_preferences` row — under the extensible `preferences` jsonb (`herne_language`),
with the `locale` column kept in sync as a fallback. **No new table or migration**;
RLS on `user_preferences` already scopes each row to its owner. The store never
clobbers other jsonb keys (it merges). `getLanguagePreferenceFor(userId)` gives the
reply path an admin-side read by explicit id.

`saveLanguagePreferenceAction` (`language-actions.ts`) is the `'use server'` entry the
settings card calls; it trusts nothing from the form (all validation is in
`resolveLanguagePreference`).

## Language-aware orchestration

The reply assemblers append `languageDirective(pref)` to the system prompt:

- `src/services/herne/reply.ts` (`herneSpecialistReply`) — resolves the preference
  (explicit `ctx.language` wins, else the signed-in person's saved preference), adds
  the directive as a prompt section, and returns the resolved `language` code.
- `src/services/specialist-reply.ts` — same directive for the generic (non-HERNE)
  path.
- `src/services/orchestration.ts` already passes `userId`, so a signed-in person's
  saved language is honoured end-to-end without threading it through every request.

The directive keeps **all safety, citations and escalation notices intact** in the
target language and instructs the model to keep the English clinical term in brackets
rather than guessing — no fabricated terminology.

## UI

- **Settings** (`/dashboard/settings`) — `LanguageVoiceCard`: language select
  (English + native name), a regional-variety select that appears only when the
  language offers varieties, a sample line rendered with correct `dir` for RTL
  languages, and a disabled *Planned* voice toggle. Saves via the server action.
- **Public** (`/specialists`) — an "In your language" band lists the catalogue's
  native names (RTL-aware) with the honest AI-generated / voice-planned note. The hero
  keeps the approved multilingual statement + honest live/planned labelling.

## Verification

`GET /api/admin/herne-language-test?slug=makela&lang=es` (administrator only) returns
the catalogue count, the capability model, the null directive for English, the
directive for the chosen language, and the SAME question answered by one specialist in
the chosen language vs English.

## Limitations / awaiting

- Language replies are AI-generated, not clinically human-reviewed; English is the
  reference version.
- Regional-dialect fidelity and voice input/output are planned, not live.
- No live speech-to-text / text-to-speech provider is connected.
