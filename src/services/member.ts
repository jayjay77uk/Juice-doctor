import 'server-only';

import type { Goal, HealthProfile, FitnessProfile, NutritionProfile } from '@/types/health';
import type { Assessment } from '@/types/consultation';
import type { Notification } from '@/types/platform';
import type { AiAgent } from '@/types/ai';
import type { Conversation } from '@/types/conversation';
import type { CustomerSubscription } from '@/types/crm';
import { specialists } from './specialists';
import { conversations_service } from './conversations';
import { subscriptionsService } from './subscriptions';
import { ok, type Result } from './result';
import { getSession } from './auth';
import { memberRepo } from './repositories/member-repo';
import { timeline } from './herne/care-plan';
import { carePlan } from './herne/care-plan';

/**
 * Member (user dashboard) read layer — the authenticated member's REAL records
 * (goals, profiles, assessments, notifications, appointments, journey, access).
 * No mock data: without a session or database, methods return empty/null and the
 * pages render their honest empty states.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

export interface JourneyEvent { date: string; title: string; description: string; type: 'assessment' | 'session' | 'milestone' | 'programme'; }
export interface Recommendation { title: string; description: string; href: string; }
export interface PillarProgress { pillarOne: number; pillarTwo: number; pillarThree: number; pillarFour: number; pillarFive: number; overall: number; }
export interface UpcomingItem { title: string; when: string; type: string; }

/** The authenticated user's id, or null (no fake fallback identity). */
async function userId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

const EMPTY_PROGRESS: PillarProgress = { pillarOne: 0, pillarTwo: 0, pillarThree: 0, pillarFour: 0, pillarFive: 0, overall: 0 };

export const member = {
  async goals(): Promise<Result<Goal[]>> {
    const uid = await userId();
    return ok(uid ? await memberRepo.goals(uid) : []);
  },
  async healthProfile(): Promise<Result<HealthProfile>> {
    const uid = await userId();
    const real = uid ? await memberRepo.healthProfile(uid) : null;
    if (real) return ok(real);
    // Honest empty profile when no record exists yet.
    return ok({
      userId: uid ?? '', organisationId: ORG, dateOfBirth: null, biologicalSex: null,
      heightCm: null, weightKg: null, bloodType: null, conditions: [], allergies: [],
      medications: [], emergencyContact: null, notes: null, updatedAt: new Date().toISOString(),
    });
  },
  async fitnessProfile(): Promise<Result<FitnessProfile>> {
    const uid = await userId();
    const real = uid ? await memberRepo.fitnessProfile(uid) : null;
    return ok(real ?? { userId: uid ?? '', organisationId: ORG, activityLevel: 'moderate', restingHeartRate: null, trainingDaysPerWeek: null, baselineMetrics: {}, notes: null });
  },
  async nutritionProfile(): Promise<Result<NutritionProfile>> {
    const uid = await userId();
    const real = uid ? await memberRepo.nutritionProfile(uid) : null;
    return ok(real ?? { userId: uid ?? '', organisationId: ORG, dietaryPattern: null, restrictions: [], intolerances: [], hydrationTargetMl: null, notes: null });
  },
  async assessments(): Promise<Result<Assessment[]>> {
    const uid = await userId();
    return ok(uid ? await memberRepo.assessments(uid) : []);
  },
  async notifications(): Promise<Result<Notification[]>> {
    const uid = await userId();
    return ok(uid ? await memberRepo.notifications(uid) : []);
  },
  async progress(): Promise<Result<PillarProgress>> {
    const uid = await userId();
    if (!uid) return ok(EMPTY_PROGRESS);
    // Pillar progress derived from the member's real goals (category → pillar).
    const rows = await memberRepo.goals(uid);
    if (!rows.length) return ok(EMPTY_PROGRESS);
    const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
    const byCat = (cats: string[]) => avg(rows.filter((g) => cats.includes(g.category)).map((g) => g.progress));
    const overall = avg(rows.map((g) => g.progress));
    return ok({
      pillarOne: byCat(['hydration']) || overall,
      pillarTwo: byCat(['nutrition']) || overall,
      pillarThree: byCat(['sleep']) || overall,
      pillarFour: byCat(['fitness', 'movement']) || overall,
      pillarFive: byCat(['wellbeing', 'other']) || overall,
      overall,
    });
  },
  async journey(): Promise<Result<JourneyEvent[]>> {
    const uid = await userId();
    if (!uid) return ok([]);
    // The member's real HERNE journey timeline, newest first.
    const events = await timeline.list(uid, 12);
    const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
    return ok(
      events.map((e) => ({
        date: fmt.format(new Date(e.createdAt)),
        title: e.title,
        description: e.detail ?? (e.specialist ? `With ${e.specialist}.` : ''),
        type: (e.type === 'referral' ? 'session' : e.type === 'assessment' ? 'assessment' : 'milestone') as JourneyEvent['type'],
      })),
    );
  },
  /** Static links into the site's own resources — content, not user data. */
  async recommendations(): Promise<Result<Recommendation[]>> {
    return ok([
      { title: 'Getting Started Guide', description: 'A simple way to get started with the platform.', href: '/resources/resource-3' },
      { title: 'Book your follow-up', description: 'Keep your momentum with a check-in.', href: '/dashboard/bookings' },
      { title: 'Meet your specialists', description: 'Start with Makela, your concierge.', href: '/dashboard/specialists' },
    ]);
  },
  async upcoming(): Promise<Result<UpcomingItem[]>> {
    const uid = await userId();
    if (!uid) return ok([]);
    const appts = await memberRepo.upcomingAppointments(uid);
    return ok(appts.map((a) => ({ title: a.title, when: a.when, type: a.type })));
  },
  /** Which specialist slugs the member can access (from active subscriptions). */
  async mySpecialistSlugs(): Promise<Result<string[]>> {
    const uid = await userId();
    if (!uid) return ok([]);
    return subscriptionsService.memberAccess(uid);
  },
  /** The specialist AIs this member can currently open and chat with. */
  async mySpecialists(): Promise<Result<AiAgent[]>> {
    const uid = await userId();
    if (!uid) return ok([]);
    const [accessResult, allResult] = await Promise.all([subscriptionsService.memberAccess(uid), specialists.all()]);
    const slugs = accessResult.ok ? accessResult.data : [];
    const list = allResult.ok ? allResult.data : [];
    return ok(list.filter((s) => slugs.includes(s.slug)));
  },
  /** The member's real conversations with their specialist AIs. */
  async myConversations(explicitUserId?: string): Promise<Result<Conversation[]>> {
    const uid = explicitUserId ?? (await userId());
    if (!uid) return ok([]);
    return conversations_service.list(uid);
  },
  /** The member's subscriptions. */
  async mySubscriptions(): Promise<Result<CustomerSubscription[]>> {
    const uid = await userId();
    if (!uid) return ok([]);
    return subscriptionsService.byMember(uid);
  },
  /** Real follow-ups: upcoming appointments + care-plan proposals awaiting the member. */
  async myFollowUps(): Promise<Result<{ title: string; detail: string; when: string }[]>> {
    const uid = await userId();
    if (!uid) return ok([]);
    const items: { title: string; detail: string; when: string }[] = [];
    const appts = await memberRepo.upcomingAppointments(uid);
    for (const a of appts.slice(0, 3)) {
      items.push({ title: a.title, detail: 'Upcoming appointment.', when: a.when });
    }
    const plan = await carePlan.get(uid);
    if (plan) {
      const actions = await carePlan.actions(plan.id);
      const proposed = actions.filter((x) => x.status === 'proposed');
      if (proposed.length) {
        items.push({
          title: `${proposed.length} care-plan proposal${proposed.length === 1 ? '' : 's'} to review`,
          detail: 'Your specialists have suggested next steps.',
          when: 'Anytime',
        });
      }
    }
    return ok(items);
  },
};
