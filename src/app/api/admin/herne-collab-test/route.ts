import { NextResponse } from 'next/server';
import { getSession } from '@/services/auth';
import { hasMinRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { carePlan, timeline } from '@/services/herne/care-plan';
import { referralEngine, escalationEngine } from '@/services/herne/referrals';

/**
 * Admin-gated end-to-end check of the collaboration layer: one shared care plan
 * updated by multiple specialists (de-duplicated), a referral that preserves
 * context, an escalation, and a continuous timeline.
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
  if (!userId) return NextResponse.json({ error: 'setup failed' }, { status: 500 });

  // One shared plan, updated by two specialists.
  const plan = await carePlan.getOrCreate(userId);
  if (!plan) return NextResponse.json({ error: 'no plan' }, { status: 500 });
  await carePlan.setGoals(plan.id, ['Improve energy', 'Reduce bloating']);
  await carePlan.addAction(plan.id, { specialist: 'serena', title: 'Track cycle + energy patterns for two weeks', evidenceRefs: ['HERNE-R-001'] });
  await carePlan.addAction(plan.id, { specialist: 'aqua', title: 'Spread fluid intake across the day', evidenceRefs: ['HERNE-H-001'] });
  const dupe = await carePlan.addAction(plan.id, { specialist: 'aqua', title: 'Spread fluid intake across the day' });

  // Referral preserves context; escalation records a human review.
  const referral = await referralEngine.refer({
    userId,
    fromSpecialist: 'serena',
    toSpecialist: 'felix',
    trigger: 'Supplement use in menstrual/perimenopause context',
    reason: 'User asked about a supplement — Felix is better placed.',
  });
  const escalation = await escalationEngine.escalate({
    userId,
    carePlanId: plan.id,
    trigger: 'emergency',
    reason: 'User mentioned severe chest pain.',
    specialist: 'aqua',
    destination: 'Human clinical review',
    urgency: 'Urgent',
  });

  const actions = await carePlan.actions(plan.id);
  const events = await timeline.list(userId, 20);

  return NextResponse.json({
    ok: true,
    carePlanId: plan.id,
    goals: (await carePlan.get(userId))?.goals ?? [],
    specialistsContributing: [...new Set(actions.map((a) => a.specialist))],
    duplicateBlocked: dupe.added === false,
    referral: {
      id: referral.referralId,
      matchedRule: referral.matchedRule,
      // context preservation: the receiving specialist inherits the current recommendations + goals
      preservedRecommendations: referral.context.recommendations,
      preservedGoals: referral.context.goals,
      receiving: referral.context.receivingSpecialist,
    },
    escalationId: escalation.escalationId,
    timelineTypes: events.map((e) => e.type),
  });
}
