# Completion Report

**Product:** Ask Juice Doctor AI — HERNE Multi-Specialist Wellbeing Platform
**Environment:** `https://juice-doctor.vercel.app` — live deployment
**Status:** Delivered and live
**Date:** 14 July 2026 (status refreshed 10 August 2026)

---

## 1. What has been built

A working, end-to-end multi-specialist AI wellbeing platform. It presents a
coordinated team of **eight wellbeing specialists** — led by Makela, a concierge who listens
first and routes each person to the right specialist — all working from **one shared evidence
base** and **one shared care plan**.

The platform delivers the full member journey (public website → sign-up → dashboard →
live specialist conversations) and a comprehensive admin portal through which the client
owns and operates the platform (specialists, evidence, prompts, referrals, wearable permissions,
safety, care plans, usage and cost).

## 2. The eight specialists

| Specialist | Role |
|---|---|
| **Makela** | Wellbeing Concierge & Care Coordinator (main entry point) |
| **Serena** | Women's Health & Hormonal Wellbeing Specialist |
| **Atlas** | Men's Health, Performance & Strength Specialist |
| **Aqua** | Hydration & Cellular Wellness Specialist |
| **Sage** | Lifestyle Medicine & Gut Health Specialist |
| **Luca** | Personal Chef & Precision Nutrition Planner |
| **Felix** | Supplement & Nutrient Optimisation Specialist |
| **Optimus** | Performance & Longevity Strategist |

Exactly these eight exist across the platform. No other AI specialists are present.

## 3. Capabilities delivered

**Live intelligence (powered by the Anthropic Claude model):**
- Each specialist gives a differentiated, evidence-grounded response to the same question, drawing
  on the one shared evidence base with record-level citations.
- Makela listens first, then recommends and hands over to the right specialist, preserving full
  context so the person never repeats themselves.
- A single shared care plan that any specialist can propose updates to, which the member accepts
  or declines.
- Safety pathway: emergency wording is caught **before** any AI runs and routed to an escalation
  message; unsupported claims and fabricated citations are stripped from responses.
- Multilingual text: the member can choose a language and specialists reply in it, with continuity
  preserved across a handoff.
- Wearable architecture: the metric catalogue, per-specialist permissions, consents and AI-access
  logs are in place. No device integration is connected yet, so wearable surfaces show honest
  empty states; when connected, specialists will only ever see permitted trend summaries (never
  raw data, never a diagnosis).

**Client-owned operations (admin portal):**
- Manage the eight specialists, the shared HERNE evidence base, versioned prompts and the shared
  behavioural DNA.
- View and manage referral rules, escalations and shared care plans.
- Wearable metric catalogue, per-specialist permissions, consents and AI-access logs.
- A live AI Playground to test any specialist safely, and usage + cost logs for every AI call.

## 4. Verification

The platform has been verified end-to-end on the live deployment. All eight specialists respond
live and grounded; specialist differentiation, referrals, the safety block, multilingual replies,
and token/cost logging have all been confirmed against the running system.

Engineering quality gates (run on every change): type-checking, linting, an automated test suite,
and a production build all pass.

## 5. Deliberate boundaries (see the Limitations document)

- The pre-production build used only fictional data; those fictional records have since been
  deleted from the live database. Real member accounts are created by registration.
- Wearable device integration is **not connected** (the live Thryve connection is not enabled);
  wearable surfaces show empty states.
- Voice conversations are **planned**, clearly labelled, and not connected.
- Language replies are AI-generated and **not yet clinically reviewed** — English is the reference.
- Emergency and self-harm wording is **interim** and awaits client-approved clinical copy.

## 6. Where the source of truth lives

All specialist knowledge, scopes, referral rules and wearable permissions come from the
client-supplied HERNE developer pack — nothing about the specialists is invented. Content the
client has not yet supplied is clearly flagged as *awaiting client approval* in the interface.
