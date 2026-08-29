#!/usr/bin/env node
/**
 * Bootstrap the FIRST platform owner (super_administrator).
 *
 * The in-app invitation flow requires an existing administrator, so the very
 * first owner cannot be created through the product. This operator-run script
 * closes that bootstrap gap safely:
 *
 *   node scripts/bootstrap-owner.mjs owner@example.com
 *
 * Behaviour:
 *  - Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (read from
 *    the environment or .env.local). The service-role key is operator-only —
 *    holding it already grants full data access, so this script adds no new
 *    trust surface. No credentials are ever hardcoded.
 *  - REFUSES to run if a DIFFERENT super_administrator already exists — after
 *    bootstrap, ownership changes must go through an existing owner in-app.
 *    Re-running for the same owner email is an idempotent no-op repair.
 *  - Creates the auth account if missing (email confirmed, NO password set),
 *    promotes its profile to super_administrator, writes an audit_logs row,
 *    and prints a ONE-TIME password-setup (recovery) link. The link is shown
 *    once and never stored; the owner signs in at the normal /login route.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Environment ──────────────────────────────────────────────────────────────

function loadDotEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
}
loadDotEnvLocal();

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const email = (process.argv[2] ?? '').trim().toLowerCase();

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_KEY) fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (env or .env.local).');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Usage: node scripts/bootstrap-owner.mjs owner@example.com');

const REST = `${SUPABASE_URL}/rest/v1`;
const AUTH = `${SUPABASE_URL}/auth/v1`;
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function api(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, ok: res.ok, body };
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

// 1) Refuse if a DIFFERENT super_administrator already exists.
const supers = await api(`${REST}/profiles?role=eq.super_administrator&select=id,email`);
if (!supers.ok) fail(`Could not check existing owners (HTTP ${supers.status}): ${JSON.stringify(supers.body)}`);
const foreignOwner = (supers.body ?? []).find((p) => (p.email ?? '').toLowerCase() !== email);
if (foreignOwner) {
  fail(`A super_administrator already exists (${foreignOwner.email}). Bootstrap only establishes the FIRST owner — further ownership changes go through them in-app.`);
}

// 2) Find or create the auth account (email confirmed, no password).
let userId = null;
const created = await api(`${AUTH}/admin/users`, {
  method: 'POST',
  body: JSON.stringify({ email, email_confirm: true }),
});
if (created.ok && created.body?.id) {
  userId = created.body.id;
  console.log(`• Created auth account ${email} (${userId})`);
} else {
  // Already registered (or other conflict) — look the user up.
  const list = await api(`${AUTH}/admin/users?page=1&per_page=200`);
  if (!list.ok) fail(`Could not create or look up the account (create HTTP ${created.status}: ${JSON.stringify(created.body)}; list HTTP ${list.status}).`);
  const users = Array.isArray(list.body?.users) ? list.body.users : [];
  const existing = users.find((u) => (u.email ?? '').toLowerCase() === email);
  if (!existing) fail(`Account creation failed (HTTP ${created.status}: ${JSON.stringify(created.body)}) and no existing account matches ${email}.`);
  userId = existing.id;
  console.log(`• Account ${email} already exists (${userId})`);
}

// 3) Promote the profile (the handle_new_user trigger created the row; upsert to be safe).
const promoted = await api(`${REST}/profiles?id=eq.${userId}`, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ role: 'super_administrator', status: 'active' }),
});
if (!promoted.ok) fail(`Could not update the profile (HTTP ${promoted.status}): ${JSON.stringify(promoted.body)}`);
if (!Array.isArray(promoted.body) || promoted.body.length === 0) {
  const inserted = await api(`${REST}/profiles`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ id: userId, email, role: 'super_administrator', status: 'active' }),
  });
  if (!inserted.ok) fail(`No profile row existed and insert failed (HTTP ${inserted.status}): ${JSON.stringify(inserted.body)}`);
  console.log('• Profile row created with role super_administrator');
} else {
  console.log(`• Profile role set to super_administrator (was: ${promoted.body[0]?.role === 'super_administrator' ? 'already owner or promoted' : 'updated'})`);
}

// 4) Audit trail (best-effort — never blocks the bootstrap).
await api(`${REST}/audit_logs`, {
  method: 'POST',
  body: JSON.stringify({
    actor_id: null,
    action: 'user.bootstrap_owner',
    entity_type: 'profiles',
    entity_id: userId,
    after: { email, role: 'super_administrator', via: 'scripts/bootstrap-owner.mjs' },
  }),
}).then((r) => {
  if (!r.ok) console.warn(`  (audit write skipped: HTTP ${r.status})`);
});

// 5) One-time password-setup link (recovery link — generated, never emailed or stored).
const link = await api(`${AUTH}/admin/generate_link`, {
  method: 'POST',
  body: JSON.stringify({ type: 'recovery', email }),
});
const actionLink = link.body?.properties?.action_link ?? link.body?.action_link ?? null;

console.log('\n✓ Platform owner established.');
console.log(`  Email: ${email}`);
console.log('  Role:  super_administrator');
console.log('  Sign-in: the normal /login route (no separate admin login exists).');
if (actionLink) {
  console.log('\n  ONE-TIME password-setup link (expires; shown once, never stored):');
  console.log(`  ${actionLink}`);
} else {
  console.log('\n  Could not generate a password-setup link — use "Forgot password" on /login instead.');
}
