# 10 — Security

> **Phase 2, design only.** Everything in this document is production-shaped but
> runs on typed mock providers and paper SQL. Every control below is *authored,
> reviewed, and version-controlled*; almost none of it is *live*. There is no
> real auth session, no connected database, no TLS terminated by us, no secrets
> in the vault. The **shape** of the security posture is the deliverable — so
> that going live is *configuration and a provider swap*, not a rewrite.

Security for Prototype AI is not a single module — it is a **posture**
that runs through every layer. A member's profile is protected four
different ways at four different distances from the attacker: by the CSP that
governs what runs in their browser, by the middleware that rejects a forged
cross-origin write, by the RBAC guard on the Server Action, and — last and most
important — by the Row-Level Security policy in Postgres that would refuse the
row even if every layer above it were bypassed. This is **defence in depth**:
no control is trusted to be the only one.

This document explains *why* each control exists, *where* it lives, and *what*
changes when the prototype goes live.

**Canonical sources:**

| Concern | File |
| --- | --- |
| Security headers + CSP | [`src/lib/security/headers.ts`](../../src/lib/security/headers.ts) |
| Rate limiting | [`src/lib/security/rate-limit.ts`](../../src/lib/security/rate-limit.ts) |
| CSRF utilities | [`src/lib/security/csrf.ts`](../../src/lib/security/csrf.ts) |
| File-upload validation | [`src/lib/security/file-validation.ts`](../../src/lib/security/file-validation.ts) |
| Typed errors | [`src/lib/security/errors.ts`](../../src/lib/security/errors.ts) |
| Edge middleware (headers, CSRF, route protection) | [`src/proxy.ts`](../../src/proxy.ts) |
| RBAC engine + guards | [`src/lib/auth/`](../../src/lib/auth) |
| Audit recorder | [`src/services/platform.ts`](../../src/services/platform.ts) |
| Audit / activity / API-key schema | [`db/migrations/0013_platform.sql`](../../db/migrations/0013_platform.sql), [`db/migrations/0004_auth_sessions_oauth.sql`](../../db/migrations/0004_auth_sessions_oauth.sql) |
| Consent ledger | [`db/migrations/0005_preferences_and_consents.sql`](../../db/migrations/0005_preferences_and_consents.sql) |
| Environment surface | [`.env.example`](../../.env.example), [`src/config/app.ts`](../../src/config/app.ts) |

---

## 1. The threat model in one picture

Every control maps to a layer, and every layer re-checks what the layer above it
already checked. The map below is the mental model for the rest of the document.

```mermaid
flowchart TB
  attacker([Untrusted request])

  subgraph edge["Edge — src/proxy.ts"]
    H["Security headers + CSP<br/>(strict prod / relaxed dev)"]
    O["CSRF Origin check<br/>(reject cross-origin mutations)"]
    R["Route-group protection<br/>((dashboard)/(admin))"]
  end

  subgraph app["Application — src/lib + src/services"]
    RL["Rate limiter<br/>(auth / contact / api / ai policies)"]
    CS["CSRF double-submit<br/>(non-Action endpoints)"]
    RB["RBAC guards<br/>(require* / assert* / can)"]
    FV["File-upload validation<br/>(size + MIME + magic number)"]
    ER["Typed AppError<br/>(user-safe messages)"]
  end

  subgraph data["Data — Postgres / Supabase"]
    RLS["RLS on EVERY table<br/>app.has_permission()"]
    AU["Append-only audit_logs"]
    ENC["Encryption at rest"]
  end

  attacker --> edge --> app --> data
```

Nothing here is novel; the discipline is in applying *all* of it, *everywhere*,
and keeping the app-layer rules and the database-layer rules in **lock-step** so
neither can drift into being the weaker link.

---

## 2. Permissions — the first line inside the app

Authorization is the largest single security surface, and it has its own
document: **[`02-authorization-rbac.md`](02-authorization-rbac.md)**. It is
summarised here only where it intersects the wider posture.

The model is a **six-role linear hierarchy** — `guest → member → practitioner →
staff → administrator → super_administrator` (ranks 0..5, defined in
[`src/lib/auth/roles.ts`](../../src/lib/auth/roles.ts) and mirrored by the
`app_role` enum in [`db/migrations/0001_extensions_and_helpers.sql`](../../db/migrations/0001_extensions_and_helpers.sql)).
Permissions are **cumulative**: each role inherits every capability of the roles
below it; `super_administrator` holds all of them implicitly, so a new
permission is auto-granted to the top role and to nobody else by accident.

Three facts about the permission model matter for security specifically:

1. **Members hold no catalogue permissions.** Access to their own data is granted
   by *ownership* (`user_id = auth.uid()` in RLS), never by a permission key. The
   catalogue in [`src/config/permissions.ts`](../../src/config/permissions.ts)
   governs only privileged, cross-user, and operational actions — so the blast
   radius of a mis-granted permission is bounded to staff-and-above surfaces.

2. **Deny always wins.** The engine in
   [`src/lib/auth/permissions.ts`](../../src/lib/auth/permissions.ts) evaluates an
   explicit user-level `deny` override *before* any role grant, and the database
   function `app.has_permission()` does the same (`not exists (… deny …) and (…
   grant …)`). A revocation cannot be defeated by also holding a grant.

3. **Sensitive actions are flagged in data.** The `sensitive: true` marker on
   entries like `users.delete`, `users.impersonate`, `roles.assign`,
   `health.read`, `payments.refund`, and `audit.read` is a machine-readable hook
   for the production requirement that these actions demand step-up confirmation
   or MFA. In Phase 2 it is a flag on the catalogue; the enforcement point is
   reserved, not yet wired.

The app-layer decision (`hasPermission`) and the database-layer decision
(`app.has_permission`) are two independent implementations of the *same* rules —
that redundancy is the point.

```mermaid
flowchart LR
  subgraph appside["App layer (advisory + UX)"]
    G["require* / assert* / can<br/>src/lib/auth/authorize.ts"]
    E["hasPermission engine<br/>src/lib/auth/permissions.ts"]
    G --> E
  end
  subgraph dbside["Data layer (authoritative)"]
    P["RLS policy<br/>USING app.has_permission('x.y')"]
  end
  E -. same rules, kept in lock-step .-> P
```

The app-layer guard gives a fast, friendly failure (a redirect or a typed error,
good UX). The RLS policy is the **authoritative** control that holds even if a
future bug skips the guard. See
[`04-rls-security-model.md`](04-rls-security-model.md) for the full RLS design.

---

## 3. Encryption strategy

Encryption is layered by *where the data is* and *how sensitive it is*.

| Data state | Control | Status in Phase 2 |
| --- | --- | --- |
| **At rest** | Postgres/Supabase-managed disk + backup encryption (AES-256); Storage buckets encrypted at rest | Provisioned by Supabase in production; DB not connected in the prototype |
| **In transit** | TLS 1.2+ everywhere; **HSTS** (`max-age=63072000; includeSubDomains; preload`) sent on HTTPS in production | HSTS emitted only when `isHttps && !isPrototype` — see below |
| **Secrets** | Never in `NEXT_PUBLIC_*`; server-only env; provider selection off non-public `APP_MODE` | Enforced structurally today (§7) |
| **Field-level (sensitive)** | Application-level encryption of the most sensitive fields | **Future** — the RLS-hardened tables are the seam it plugs into |

**At rest.** We do not roll our own storage encryption. Postgres data files,
WAL, and automated backups are encrypted by the managed platform; Storage
objects (knowledge documents, avatars, CVs) inherit bucket-level encryption. Our
job is to make sure the *right rows* are readable, which is RLS's problem, not
the cipher's.

**In transit.** All traffic is HTTPS; the platform terminates TLS. We reinforce
it with HSTS so a browser that has once seen the site over HTTPS refuses to
downgrade. HSTS is deliberately conditional in
[`src/proxy.ts`](../../src/proxy.ts):

```ts
const headersToSet = securityHeaders({ hsts: isHttps && !appConfig.isPrototype, dev: isDev });
```

`preload` is a one-way commitment (browsers ship the domain in a hard-coded
list), so it must never fire from a prototype or preview origin — hence the
`!isPrototype` guard. The header itself is assembled in
[`headers.ts`](../../src/lib/security/headers.ts).

**Field-level, for the most sensitive data (future).** The most sensitive tables
(`health_profiles`, `medical_questionnaires`, `fitness_profiles`,
`nutrition_profiles` in [`0006_health_profiles.sql`](../../db/migrations/0006_health_profiles.sql))
already carry the *strictest* RLS: a row is visible only to its owner, a treating
same-org practitioner/staff member (read-only), and org admins. Application-level
field encryption — encrypting the most sensitive columns so that even a database
operator with row access cannot read raw values — is a Phase-3 hardening step.
It is called out here rather than implemented because it changes read/write
plumbing, and the honest prototype does not pretend to protect data it never
stores.

---

## 4. Audit logging

The platform must be able to answer *"who changed this record, when, from
where, and what did it look like before?"* — for security investigation, for
regulatory inquiry, and for member data-subject requests. That answer lives in
an **append-only, immutable forensic trail**.

**Schema** ([`db/migrations/0013_platform.sql`](../../db/migrations/0013_platform.sql)).
`audit_logs` captures the who / what / before / after / where:

```sql
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete set null, -- NULL = platform-level
  actor_id        uuid references auth.users (id) on delete set null,           -- NULL = system/cron/anon
  action          text not null,   -- e.g. 'profile.updated'
  entity_type     text not null,   -- e.g. 'profiles'
  entity_id       text,
  before          jsonb,           -- snapshot pre-change
  after           jsonb,           -- snapshot post-change
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);
```

**Immutability is enforced by the *absence* of policies, not by convention.**
The only RLS policy on `audit_logs` is a `SELECT` policy (`audit_logs_admin_read`,
gated on `audit.read`-holding admins for their org, super-admins platform-wide).
There is **no `INSERT`, `UPDATE`, or `DELETE` policy** — so no user session can
forge, alter, or erase the trail. Writes happen server-side under the service
role only. `activity_logs` (a lighter product-analytics stream) follows the same
append-only pattern with a broader read scope (a user reads their own activity).

**The recorder.** Call sites do not `INSERT` directly — they call the `audit`
recorder in [`src/services/platform.ts`](../../src/services/platform.ts):

```ts
export const audit = {
  async record(_entry: AuditEntry): Promise<void> {
    // no-op in the prototype — nothing is stored.
  },
  // …
};
```

`AuditEntry` already carries `actorId`, `action`, `entityType`, `entityId`,
`before`, `after`, and `organisationId` — the full production shape. In the
prototype `record` is an honest **no-op** (nothing is stored, and the doc says
so). In production the body inserts one append-only row under the service role,
enriched with `ip_address` and `user_agent` from the request. Because the shape
is settled, wiring it up is a body swap, not a redesign. The `sensitive`-flagged
permissions in §2 are the natural set of actions the recorder must never miss.

---

## 5. Rate limiting

Rate limiting protects against credential-stuffing, contact-form spam, scraping,
and — once inference exists — AI cost-abuse. The design goal is that the
*call sites never change* between the prototype's in-memory limiter and a
production distributed store.

**The seam** ([`src/lib/security/rate-limit.ts`](../../src/lib/security/rate-limit.ts)).
Everything hangs off one interface:

```ts
export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>; // { allowed, limit, remaining, resetAt }
}
```

It is `async`, keyed by an arbitrary string (identity or IP), and returns
`remaining` / `resetAt` so the caller can emit `Retry-After` and
`X-RateLimit-*` headers — the production shape, even though the shipped
implementation is a single-process fixed-window `Map`. Production swaps in a
Redis/Upstash or Postgres-backed limiter implementing the *same* interface;
no call site moves.

**Enforcement** is centralised in `enforceRateLimit`, which throws the typed
`RateLimitError` (carrying `retryAfterSeconds`) so it flows through the same
error pipeline as everything else (§10):

```ts
export async function enforceRateLimit(limiter: RateLimiter, key: string): Promise<void> {
  const result = await limiter.check(key);
  if (!result.allowed) {
    throw new RateLimitError(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)));
  }
}
```

**Policies** are named, not scattered as magic numbers, so limits are reviewed in
one place:

| Policy | Limit | Window | Protects |
| --- | --- | --- | --- |
| `auth` | 5 | 60 s | Login / credential endpoints (anti brute-force) |
| `contact` | 3 | 60 s | Public contact form (anti-spam) |
| `api` | 100 | 60 s | General authenticated API surface |
| `ai` | 20 | 60 s | **Future** AI endpoints (cost + abuse control) |

The `ai` policy is defined ahead of the feature it guards — the inference
surface is rate-limited *by design* before a single token is ever generated.

---

## 6. CSRF strategy

Cross-Site Request Forgery is defended in **three overlapping ways**, so no
single assumption carries the whole load.

```mermaid
flowchart TB
  req([Mutating request]) --> L1
  L1["1. SameSite=Lax auth cookies<br/>blocks classic cross-site form POST"] --> L2
  L2["2. Origin check in proxy.ts<br/>reject if Origin ≠ Host"] --> L3
  L3["3. Double-submit token<br/>cookie value must equal header value"] --> ok([Allowed])
```

1. **Same-origin by construction.** Next.js Server Actions are POST-only and
   same-origin by design, and Supabase auth cookies use `SameSite=Lax`, which
   blocks the classic cross-site form-POST vector before any of our code runs.

2. **Origin check at the edge.** [`src/proxy.ts`](../../src/proxy.ts) rejects any
   mutating method (`POST/PUT/PATCH/DELETE`) whose `Origin` does not match the
   `Host`:

   ```ts
   if (MUTATING_METHODS.has(method)) {
     const origin = headers.get('origin');
     if (origin && !isSameOrigin(origin, host)) {
       return new NextResponse('Cross-origin request blocked', { status: 403 });
     }
   }
   ```

   `isSameOrigin` lives in [`csrf.ts`](../../src/lib/security/csrf.ts) and
   compares parsed hosts (a bad `Origin` URL fails closed).

3. **Double-submit token for custom endpoints.** Any mutating endpoint that is
   *not* a Server Action (a future route handler, a webhook receiver) uses the
   double-submit-cookie pattern: a cryptographically strong token
   (`generateCsrfToken`, Web-Crypto, edge-compatible) is set as the
   `__Host-ajd-csrf` cookie *and* echoed in the `x-ajd-csrf` header; the server
   requires them to match via `verifyDoubleSubmit`, which uses a **constant-time**
   comparison (`safeEqual`) to avoid timing side-channels. The `__Host-` prefix
   forces the cookie to be secure, host-scoped, and path-`/`.

Layers 1 and 2 cover the common case; layer 3 exists so the *custom-endpoint*
gap is closed the moment such an endpoint is added.

---

## 7. Secrets management

The governing rule: **a secret must be structurally incapable of reaching the
browser.** We do not rely on remembering to keep keys server-side — the
architecture makes leaking them the hard path.

**The public/non-public split** ([`src/config/app.ts`](../../src/config/app.ts),
[`.env.example`](../../.env.example)). There are two mode variables, and the
distinction is load-bearing:

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_MODE` | **Public** (safe in the client bundle) | Cosmetic only — drives the "Prototype Environment" banner |
| `APP_MODE` | **Server-only, non-public** | Selects the data provider (mock vs Supabase) inside `server-only` modules |

Because the provider choice is made off the **non-public** `APP_MODE` inside
`server-only` service modules, a Supabase client — and the keys it needs —
**can never be tree-shaken into a client bundle**. `config.isPrototype` derives
from the cosmetic public flag and is used *only* for UI affordances; no secret
is ever gated on it. This is Rule 2 of the project philosophy expressed as a
security control.

**The secret surface** is enumerated in [`.env.example`](../../.env.example) and
commented as Phase-2 (not used by the prototype):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public by
  design (the anon key is safe only *because* RLS is on every table).
- `SUPABASE_SERVICE_ROLE_KEY` — **never** `NEXT_PUBLIC_`; used only by
  server-side, RLS-bypassing operations such as the audit recorder.
- `RESEND_API_KEY`, `CONTACT_EMAIL` — server-only.

The prototype requires **no secrets to run**, which is itself a security
property: there is nothing to leak from a demo deploy. In production these live
in the platform's encrypted environment store (Vercel), never in the repo.

---

## 8. API security

The public/machine-to-machine API is designed but not exposed in Phase 2.

**Keys are hashed, never stored in plaintext**
([`db/migrations/0004_auth_sessions_oauth.sql`](../../db/migrations/0004_auth_sessions_oauth.sql)):

```sql
create table public.api_keys (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name            text not null,
  key_prefix      text not null,   -- first chars, shown in the UI for identification
  key_hash        text not null,   -- sha-256 of the full key
  scopes          text[] not null default '{}',
  created_by      uuid references auth.users (id) on delete set null,
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (key_prefix)
);
```

Design decisions and *why*:

- **Only the hash is persisted.** The plaintext key is shown **once** at
  creation and never recoverable — a database breach yields hashes, not
  usable keys. `key_prefix` exists solely so a human can identify a key in the
  UI without the platform ever holding the secret.
- **Scopes are least-privilege.** `scopes text[]` lets a key be minted with
  exactly the capabilities it needs, so a leaked integration key is bounded.
- **Expiry and revocation are first-class.** `expires_at` and `revoked_at`
  (with a partial index on non-revoked keys) make rotation and instant kill a
  data operation, not a code change.
- **The table is admin-only, hash unreadable.** The `api_keys_admin` RLS policy
  restricts all access to same-org admins (`organisation_id = app.current_org_id()
  and app.is_admin()`); `key_hash` is never selectable by a non-admin because the
  whole table is.
- **Auth events are audited.** `auth_events` (same migration) is an append-only
  record of logins, failures, resets, and MFA challenges, inserted via
  `SECURITY DEFINER` server code (no `INSERT` policy exposed), and rate-limited
  by the `auth` policy in §5.

Every API request would be authenticated by hashing the presented key and
matching it, then authorized by intersecting its scopes with the RBAC catalogue —
the same permission model as human sessions, so there is one authorization system,
not two.

---

## 9. File-upload validation & malware scanning

Uploads (knowledge documents, avatars, CV attachments) are a classic ingress
vector, so [`file-validation.ts`](../../src/lib/security/file-validation.ts)
**never trusts the client-supplied filename or MIME type alone** — it validates
size *and* true content, and fails closed with a typed error.

`validateUpload` runs four checks in order:

1. **Size** against a per-constraint `maxBytes` (25 MB for knowledge documents,
   4 MB for avatars) → `payload_too_large`.
2. **Extension** against an allow-list → `unsupported_media`.
3. **Declared MIME** against an allow-list → `unsupported_media`.
4. **Magic-number sniffing** of the file's first bytes against known signatures
   (`%PDF`, the `PK\x03\x04` ZIP header for `.docx`, PNG/JPG/WEBP) → a renamed
   executable masquerading as a PDF is rejected because *"that file's contents do
   not match its type."*

```mermaid
flowchart LR
  U([Upload]) --> S{size ok?}
  S -- no --> X1["413 payload_too_large"]
  S -- yes --> E{ext allowed?}
  E -- no --> X2["415 unsupported_media"]
  E -- yes --> M{MIME allowed?}
  M -- no --> X2
  M -- yes --> N{magic number matches?}
  N -- no --> X2
  N -- yes --> Z["future: enqueue malware scan"] --> A([Accept])
```

Text formats (`txt`/`csv`) have no reliable magic number and skip the signature
check by design — the size, extension, and MIME gates still apply.

**Future malware scanning.** The final step is an explicit reserved hook:

```ts
// future: enqueue for malware scanning (ClamAV / cloud scanner) before accept.
```

The contract is deliberate: a file passing the four static checks is *validated*,
not yet *accepted*. In production the scan (ClamAV or a cloud scanning service)
runs before the object is durably stored and served, so infected content never
reaches another user. Placing the hook here — rather than bolting scanning on
later — means the accept/quarantine state machine has a home from day one.

---

## 10. Security headers & CSP

Every response carries a strict, documented header baseline, applied centrally in
[`src/proxy.ts`](../../src/proxy.ts) from
[`headers.ts`](../../src/lib/security/headers.ts) — so no route can forget them.

| Header | Value / intent |
| --- | --- |
| `Content-Security-Policy` | Strict allow-list (see below) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (plus CSP `frame-ancestors 'none'`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Deny all powerful features except `camera=(self)` for the Remote Selfie Scan |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Strict-Transport-Security` | Sent only on HTTPS in production (§3) |

**The CSP is conservative by default and loosened *per source, with a comment* —
never globally.** `default-src 'self'`; `object-src 'none'`; `base-uri 'self'`;
`form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests`.
Supabase and Resend endpoints get added to `connect-src` *when they are wired*,
not pre-opened.

**The one place strictness is intentionally relaxed is scripts in development.**
React's dev tooling uses `eval`, which a strict CSP forbids, so the builder
branches on mode:

```ts
const scriptSrc = dev
  ? `'self' 'unsafe-inline' 'unsafe-eval'`          // DEV ONLY: React dev mode needs eval
  : nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`    // PROD: per-request nonce
    : `'self' 'unsafe-inline'`;
```

- **Development** allows `'unsafe-inline' 'unsafe-eval'` so the dev server and
  fast-refresh work — this path is gated on `dev` and can never ship.
- **Production** uses a **per-request nonce** with `'strict-dynamic'`, the modern
  strong-CSP posture: only the nonce'd bootstrap script and what it loads run;
  injected inline `<script>` does not. The nonce is minted per request and wired
  in `proxy.ts`.

`style-src` keeps `'unsafe-inline'` in both modes — a documented, deliberate
trade-off for the inline/critical-CSS approach, and a far weaker vector than
inline script. The `dev` flag comes from `process.env.NODE_ENV`, not from the
cosmetic app mode, so a production build is strict regardless of prototype
banners.

---

## 11. Error handling — safe by construction

An error message is an information-disclosure surface: a leaked stack trace, SQL
fragment, or internal ID hands an attacker a map. [`errors.ts`](../../src/lib/security/errors.ts)
makes leakage *structurally hard* by splitting every error into an internal half
and a user-safe half.

Every `AppError` carries:

- a stable **`code`** (`unauthenticated`, `forbidden`, `not_found`,
  `validation`, `conflict`, `rate_limited`, `payload_too_large`,
  `unsupported_media`, `internal`),
- the correct HTTP **`status`** (mapped from the code — 401/403/404/422/409/429/413/415/500),
- a **`safeMessage`** *"guaranteed to contain no internal detail"*,
- and, separately, an internal `message`/`cause` that **stay server-side for
  logging only**.

`toClient()` serialises **only** the `code`, `safeMessage`, and any explicitly
whitelisted `details` — the internal message and cause are never in the payload.
The typed subclasses give call sites a vocabulary: `AuthenticationError`,
`AuthorizationError`, `NotFoundError`, `ValidationError`, `RateLimitError`.

The **critical funnel is `toAppError`**: any unexpected thrown value (a raw
Postgres error, a `TypeError`, anything) is normalised into a generic
`internal` `AppError` whose client-facing message is the deliberately bland
*"Something went wrong. Please try again."* — while the original is preserved as
`cause` for server logs:

```ts
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  return new AppError('internal', 'Something went wrong. Please try again.', {
    message: err instanceof Error ? err.message : String(err),
    cause: err,
  });
}
```

This is why the whole app can afford to be liberal about *throwing* — the guards
(§2) throw `AuthorizationError`, the limiter (§5) throws `RateLimitError`, the
validator (§9) throws `AppError` — because there is exactly one place errors turn
into user-facing text, and that place cannot leak. Server Actions surface these
as a typed `ActionResult` rather than an unhandled exception (see
[`src/services/actions.ts`](../../src/services/actions.ts) and
[`src/services/result.ts`](../../src/services/result.ts)).

---

## 12. Consents & GDPR

For this platform, *lawful basis* is a security concern, not just a legal
one. [`0005_preferences_and_consents.sql`](../../db/migrations/0005_preferences_and_consents.sql)
records consent as an **append-only, versioned ledger** (`user_consents`): a new
row is written each time consent is given or withdrawn, keyed by
`(user, consent_type)` with a `policy_version`. Because it is **versioned**, a
policy change re-prompts rather than silently assuming stale consent; because it
is **append-only** (no update/delete policy exists, mirroring `audit_logs`), the
record of *what was agreed and when* cannot be rewritten. A user manages their
own consents; staff may read them to honour data-subject requests. This ledger,
plus the audit trail (§4) and the strict sensitive-data RLS (§3), is what lets the platform
answer a regulator honestly.

---

## 13. Prototype vs. production — what is live today

An honest security document says what is *not* yet real. The **shapes** are
production-grade; the **enforcement** is partial by design.

| Control | Designed | Enforced in prototype | Becomes live by |
| --- | --- | --- | --- |
| RBAC engine + guards | ✅ | ✅ (against canned sessions) | Real session in [`session.ts`](../../src/lib/auth/session.ts) |
| RLS on every table | ✅ | ❌ (DB not connected) | Running the migrations |
| Security headers + CSP | ✅ | ✅ (applied on every response) | HSTS/nonce flip on in prod build |
| CSRF Origin check | ✅ | ✅ (`proxy.ts` runs) | — |
| CSRF double-submit | ✅ | n/a (no custom endpoints yet) | First non-Action endpoint |
| Rate limiting | ✅ | in-memory limiter available | Distributed store swap |
| Audit logging | ✅ (shape + recorder) | ❌ no-op recorder | Recorder body + service role |
| Encryption at rest | ✅ (managed) | ❌ (no DB) | Supabase provisioning |
| HSTS / TLS | ✅ | ❌ (gated off in prototype) | HTTPS + `!isPrototype` |
| Field-level encryption | described | ❌ | Phase 3 |
| Malware scanning | hook reserved | ❌ | Scanner integration |
| API-key auth | ✅ (schema) | ❌ (API not exposed) | Public API phase |

The route-protection block in `proxy.ts` is the clearest illustration: the
production code path (read the Supabase auth cookie, redirect to `/login`) is
*present and commented in*, gated behind `!appConfig.isPrototype`, and bypassed
only because the prototype has no real auth cookie. Going live activates it — it
was never deleted.

---

## Related documents

- [`00-overview.md`](00-overview.md) — the prototype-vs-production philosophy and the seam
- [`02-authorization-rbac.md`](02-authorization-rbac.md) — the full role & permission model summarised in §2
- [`03-database.md`](03-database.md) — schema conventions, the `app` helper functions, and the ERD
- [`04-rls-security-model.md`](04-rls-security-model.md) — Row-Level Security, the authoritative data-layer control
- [`db/README.md`](../../db/README.md) — migration inventory and table map
