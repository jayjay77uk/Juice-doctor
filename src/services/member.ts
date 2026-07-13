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

/**
 * Member (user dashboard) read layer. Prototype returns canned member data so
 * the dashboard is fully populated; production reads the member's own rows
 * (health_profiles, goals, assessments, notifications…) behind RLS. No AI.
 */

const ORG = '00000000-0000-0000-0000-000000000001';
const USER = 'usr_member';
const TS = '2026-07-10T00:00:00.000Z';

const goals: Goal[] = [
  { id: 'goal_energy', userId: USER, organisationId: ORG, category: 'wellbeing', title: 'Goal One', description: 'Sample goal description one.', targetValue: 8, unit: '/10', baselineValue: 4, currentValue: 6, targetDate: '2026-09-01', status: 'active', progress: 50 },
  { id: 'goal_hydration', userId: USER, organisationId: ORG, category: 'hydration', title: 'Goal Two', description: 'Sample goal description two.', targetValue: 2500, unit: 'ml', baselineValue: 1200, currentValue: 2000, targetDate: '2026-08-01', status: 'active', progress: 62 },
  { id: 'goal_sleep', userId: USER, organisationId: ORG, category: 'sleep', title: 'Goal Three', description: 'Sample goal description three.', targetValue: 7.5, unit: 'hrs', baselineValue: 5.5, currentValue: 6.5, targetDate: '2026-08-15', status: 'active', progress: 50 },
];

const health: HealthProfile = {
  userId: USER, organisationId: ORG, dateOfBirth: null, biologicalSex: null, heightCm: 172, weightKg: 74,
  bloodType: null, conditions: [], allergies: ['Sample Allergy'], medications: [], emergencyContact: null,
  notes: 'Prototype demo profile — not real data.', updatedAt: TS,
};
const fitness: FitnessProfile = {
  userId: USER, organisationId: ORG, activityLevel: 'moderate', restingHeartRate: 62, trainingDaysPerWeek: 3,
  baselineMetrics: {}, notes: null,
};
const nutrition: NutritionProfile = {
  userId: USER, organisationId: ORG, dietaryPattern: 'Sample dietary pattern', restrictions: [], intolerances: ['Sample Intolerance'],
  hydrationTargetMl: 2500, notes: null,
};

const assessments: Assessment[] = [
  { id: 'asmt_mot', userId: USER, organisationId: ORG, type: 'body_mot', status: 'reviewed', title: 'Assessment', results: { overall: 72 }, score: 72, aiSummary: null, createdBy: USER, reviewedBy: 'usr_practitioner', reviewedAt: TS, createdAt: TS },
  { id: 'asmt_scan', userId: USER, organisationId: ORG, type: 'selfie_scan', status: 'complete', title: 'Selfie Scan', results: { overall: 68 }, score: 68, aiSummary: null, createdBy: USER, reviewedBy: null, reviewedAt: null, createdAt: TS },
];

const notifications: Notification[] = [
  { id: 'ntf_1', organisationId: ORG, userId: USER, type: 'reminder', title: 'Your follow-up is coming up', body: 'Session with Practitioner One on Thu 17 Jul.', channel: 'in_app', data: {}, readAt: null, createdAt: TS },
  { id: 'ntf_2', organisationId: ORG, userId: USER, type: 'progress', title: 'Week 3 complete', body: 'Your progress is trending up — nice work.', channel: 'in_app', data: {}, readAt: TS, createdAt: TS },
];

export interface JourneyEvent { date: string; title: string; description: string; type: 'assessment' | 'session' | 'milestone' | 'programme'; }
export interface Recommendation { title: string; description: string; href: string; }
export interface SavedConversation { id: string; title: string; agent: string; updatedAt: string; preview: string; }
export interface PillarProgress { pillarOne: number; pillarTwo: number; pillarThree: number; pillarFour: number; pillarFive: number; overall: number; }
export interface UpcomingItem { title: string; when: string; type: string; }

export const member = {
  async goals(): Promise<Result<Goal[]>> { return ok(goals); },
  async healthProfile(): Promise<Result<HealthProfile>> { return ok(health); },
  async fitnessProfile(): Promise<Result<FitnessProfile>> { return ok(fitness); },
  async nutritionProfile(): Promise<Result<NutritionProfile>> { return ok(nutrition); },
  async assessments(): Promise<Result<Assessment[]>> { return ok(assessments); },
  async notifications(): Promise<Result<Notification[]>> { return ok(notifications); },
  async progress(): Promise<Result<PillarProgress>> {
    return ok({ pillarOne: 78, pillarTwo: 58, pillarThree: 64, pillarFour: 70, pillarFive: 62, overall: 72 });
  },
  async journey(): Promise<Result<JourneyEvent[]>> {
    return ok([
      { date: '6 Jul', title: 'First assessment completed', description: 'Your baseline across all five pillars.', type: 'assessment' },
      { date: '6 Jul', title: 'Started Programme One', description: 'Focusing on the first pillars.', type: 'programme' },
      { date: '9 Jul', title: 'First check-in call', description: 'Reviewed early wins with your practitioner.', type: 'session' },
      { date: '10 Jul', title: 'Progress milestone', description: 'Hit your daily target 5 days running.', type: 'milestone' },
    ]);
  },
  async recommendations(): Promise<Result<Recommendation[]>> {
    return ok([
      { title: 'Getting Started Guide', description: 'A simple way to get started with the platform.', href: '/resources/resource-3' },
      { title: 'Book your follow-up', description: 'Keep your momentum with a check-in.', href: '/book?service=consultation-3' },
      { title: 'Product Overview', description: 'Recommended based on your goals.', href: '/resources' },
    ]);
  },
  async savedConversations(): Promise<Result<SavedConversation[]>> {
    return ok([
      { id: 'conv_1', title: 'Getting started', agent: 'Makela', updatedAt: '9 Jul', preview: 'We talked about getting set up on the platform…' },
      { id: 'conv_2', title: 'General enquiry', agent: 'Serena', updatedAt: '7 Jul', preview: 'A quick question about how the platform works…' },
    ]);
  },
  async upcoming(): Promise<Result<UpcomingItem[]>> {
    return ok([
      { title: 'Follow-up with Practitioner One', when: 'Thu 17 Jul · 4:00pm', type: '1:1' },
      { title: 'Week 4 group check-in', when: 'Mon 21 Jul · 9:00am', type: 'Group' },
    ]);
  },
  /** Which specialist slugs the member can access (from active subscriptions). */
  async mySpecialistSlugs(): Promise<Result<string[]>> {
    return subscriptionsService.memberAccess(USER);
  },
  /** The specialist AIs this member can currently open and chat with. */
  async mySpecialists(): Promise<Result<AiAgent[]>> {
    const [accessResult, allResult] = await Promise.all([subscriptionsService.memberAccess(USER), specialists.all()]);
    const slugs = accessResult.ok ? accessResult.data : [];
    const list = allResult.ok ? allResult.data : [];
    return ok(list.filter((s) => slugs.includes(s.slug)));
  },
  /** The member's real conversations with their specialist AIs. */
  async myConversations(userId: string = USER): Promise<Result<Conversation[]>> {
    return conversations_service.list(userId);
  },
  /** The member's subscriptions. */
  async mySubscriptions(): Promise<Result<CustomerSubscription[]>> {
    return subscriptionsService.byMember(USER);
  },
  /** Follow-up items for the member. */
  async myFollowUps(): Promise<Result<{ title: string; detail: string; when: string }[]>> {
    return ok([
      { title: 'Continue with Makela', detail: 'Pick up your last conversation.', when: 'Anytime' },
      { title: 'Complete your profile', detail: 'Add a few details so your specialists can help more.', when: 'This week' },
    ]);
  },
};
