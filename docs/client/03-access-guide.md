# Access Guide (Private)

> **Private — do not share publicly or embed on any public page.** This guide contains the
> operational administrator sign-in for the live platform.

**Site:** `https://juice-doctor.vercel.app`
**Sign-in page:** `https://juice-doctor.vercel.app/login`

---

## Platform owner (super administrator)

| Role | Email | Password | Lands on |
|---|---|---|---|
| **Super Administrator** (platform owner) | `juicedr03@gmail.com` | *set privately — never stored in documents* | `/admin` (admin portal) |

The owner signs in at the **normal `/login` route** — there is no separate admin login. The
account was established with the one-time bootstrap mechanism (`scripts/bootstrap-owner.mjs`),
which is operator-run with the server-only service-role key, refuses to run once an owner
exists, and never stores credentials. Further administrators are invited in-app from
**Admin → Users → Invite user**.

## Administrator access (operational)

| Role | Email | Password | Lands on |
|---|---|---|---|
| **Administrator** | `admin@prototypeai.app` | `ChangeMe!Admin2026` | `/admin` (admin portal) |

Use this account for the admin portal walkthrough (HERNE hub, referrals, wearable, shared DNA,
AI Playground, usage/cost). **Recommend the owner rotates or removes this legacy engineering
login now that the owner account exists.**

The former fictional member, customer and practitioner accounts — and all fictional records —
have been **deleted from the live database**.

## Viewing the member experience

Register a fresh account via **Sign up** (`/register`) and sign in with it — new accounts land on
`/dashboard` (the member area). Use a registered member account for the six guided journeys
(specialist chat, care plan, connected health, language settings). Note: no verification email is
sent, because an email provider is not yet connected; registration completes without it.

A dedicated practitioner console is not yet built; the human-review destination in Journey 4 is a
production item on the roadmap.

## How to switch accounts
Use **Sign out** (top-right of the dashboard/admin header), then sign in again with a different
account. Administrators also see an **"Admin dashboard →"** cross-link inside the member area.

## Good to know during a walkthrough
- Live AI replies **stream in over a few seconds** — this is expected.
- No emails are sent apart from the password-reset message, and no online payments are processed
  (subscription payments are recorded manually). Bookings are stored as real records in the
  platform database — no confirmation email or payment is attached.

## Security reminder
Rotate the administrator credentials on your own schedule and do not reuse this password
elsewhere. No production secrets, API keys, or database credentials are contained in this guide
or any client-facing document.
