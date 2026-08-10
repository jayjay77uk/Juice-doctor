# Client Walkthrough Script

A suggested running order for presenting the platform. The whole walkthrough takes ~20–25 minutes.
Run it on the live deployment: **`https://prototypeai-rose.vercel.app`**.

> **Before you start:** open the site on a desktop browser for the fullest experience (the site is
> also fully mobile-responsive). Sign-in details are in the **Access Guide**. Live AI replies
> take a few seconds to stream in — this is normal.

---

## Part A — The public experience (2–3 min)

1. Open the home page. Point out **Makela, your wellbeing concierge**, the eight-specialist team, and
   the one shared care plan.
2. Click **Meet your team** (or "Your Wellbeing Team" in the nav) to open the specialists page.
   Show the eight specialists, the shared values (DNA), the multilingual/voice statement, and the
   "how your team works together" journey.
3. Open any specialist (e.g. **Serena**) to show the premium per-specialist profile.

## Part B — Register and the member dashboard (2–3 min)

4. Register a fresh member account via **Sign up** (see the Access Guide — the former fictional
   walkthrough accounts have been deleted), then sign in with it.
5. Walk the dashboard: overview, **My care plan**, **My specialists**, **Connected health**
   (wearable integration not yet connected — an honest empty state), **Settings** (language & voice
   preference, memory controls).

## Part C — The six guided journeys (12–15 min)

These are the heart of the walkthrough. Start each from **My specialists → New conversation**
(Makela first), or open an existing conversation.

### Journey 1 — Makela intake → Serena referral → grounded response → care-plan proposal
- Message Makela: *"I've been feeling exhausted and low, and my cycle has been irregular."*
- Makela listens, then suggests **Serena**. Continue with Serena; show the **grounded reply with
  citation chips** and a **care-plan proposal** the member can accept.

### Journey 2 — Makela intake → Atlas → Aqua support → Makela follow-up
- Message Makela about **energy and training performance**; she routes to **Atlas**.
- Atlas brings in **Aqua** for hydration support; return to **Makela** for follow-up. Show that
  context carries across every handoff (the person never repeats themselves).

### Journey 3 — Connected health honesty + Optimus on recovery
- Open **Connected health**: no wearable device is connected yet, and the page says so honestly —
  the permission/consent architecture is ready for when the live connection is enabled.
- Ask **Optimus** about recovery/performance: the reply is grounded in the evidence base; no
  wearable data is referenced, because none is connected — the platform never invents readings.

### Journey 4 — Felix: supplement + medication → human review
- Ask **Felix**: *"Should I take a magnesium supplement? I'm also on blood pressure medication."*
- Felix applies the medication boundary and **refers for human clinical review** rather than
  advising directly.

### Journey 5 — Emergency wording → safety pathway before any AI
- Message any specialist: *"I have severe chest pain and can't breathe."*
- The platform **stops before the model runs** and shows the emergency escalation message. Point out
  that this is caught *before* inference — safety is enforced by the platform, not left to the model.

### Journey 6 — Language continuity across a handoff
- In **Settings → Language & voice**, choose another language (e.g. **Spanish** or **French**).
- Start a conversation; the specialist replies in that language. Hand off to another specialist and
  show the language is **preserved**. Note the honest label: AI-generated, not clinically reviewed.

## Part D — The admin portal (5 min)

6. Sign out and sign in as the **administrator** account (see the Access Guide).
7. Show, in order:
   - **HERNE → Overview**: exactly **8 specialists**, shared evidence, referral rules, care plans,
     wearable metrics, AI-access logs — all read live from the database.
   - **HERNE → Referrals**: the 15-rule referral matrix + escalations.
   - **HERNE → Wearable**: metric catalogue + the specialist × metric permission matrix + consents.
   - **HERNE → Shared DNA**: edit a value and save (it changes every specialist immediately).
   - **AI → Playground**: pick a specialist, run a live test, and inspect the assembled prompt,
     retrieved evidence, citations, tokens and estimated cost.
   - **AI → Analytics** / usage: token and cost logging for real AI calls.

## Closing

Re-state the boundaries clearly: wearable device integration is not yet connected; voice is
planned; language replies are AI-generated and not clinically reviewed; the emergency wording is
interim and awaits the client's approved clinical copy; and the platform is not for emergency use
and does not replace a healthcare professional.
