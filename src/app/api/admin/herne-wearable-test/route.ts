import { NextResponse } from 'next/server';
import { getSession } from '@/services/auth';
import { hasMinRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from '@/services/herne/records';
import {
  ingestWearableCatalog,
  wearableConsent,
  syncWearables,
  buildWearableContext,
  evaluateWearableEscalations,
} from '@/services/herne/wearable/store';

/**
 * Admin-gated end-to-end check of the wearable foundation: catalogue import,
 * consent gate, mock sync, specialist-scoped + minimised AI context, and a
 * wearable-triggered escalation. No live Thryve.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || !hasMinRole(session.user.role, 'administrator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const sb = createAdminClient();
  const prof = sb ? await sb.from('profiles').select('id').limit(1).maybeSingle() : null;
  const userId = prof?.data?.id as string | undefined;
  if (!userId || !sb) return NextResponse.json({ error: 'setup failed' }, { status: 500 });

  const catalog = await ingestWearableCatalog();

  // Consent gate: no consent → no AI context.
  await wearableConsent.revoke(userId);
  const contextNoConsent = await buildWearableContext('optimus', userId);

  // Grant consent + sync mock data.
  await wearableConsent.grant(userId);
  const sync = await syncWearables(userId);

  // Specialist-scoped AI context: Optimus (broad) vs Luca (limited).
  const optimus = await buildWearableContext('optimus', userId);
  const luca = await buildWearableContext('luca', userId);

  // Wearable-triggered escalation: inject a concerning resting-HR trend, then evaluate.
  await sb.from('wearable_trend_summaries').delete().eq('user_id', userId).eq('metric_id', 'resting_heart_rate');
  await sb.from('wearable_trend_summaries').insert({
    organisation_id: HERNE_ORG,
    user_id: userId,
    metric_id: 'resting_heart_rate',
    window: 'weekly',
    average: 74,
    baseline: 58,
    deviation: 16,
    direction: 'up',
    confidence: 0.8,
    coverage: 1,
  });
  const escalation = await evaluateWearableEscalations(userId);

  return NextResponse.json({
    ok: true,
    catalogueCount: catalog.count,
    catalogueExpectedMet: catalog.expectedMet,
    consentGate: { withoutConsent: contextNoConsent.metrics.length, note: 'expected 0 without consent' },
    sync,
    optimusMetrics: optimus.metrics.map((m) => m.metricId),
    lucaMetrics: luca.metrics.map((m) => m.metricId),
    accessControlDiffers: JSON.stringify(optimus.metrics.map((m) => m.metricId).sort()) !== JSON.stringify(luca.metrics.map((m) => m.metricId).sort()),
    wearableEscalations: escalation.escalated,
  });
}
