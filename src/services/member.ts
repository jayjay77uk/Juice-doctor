import 'server-only';

import type { Goal, HealthProfile, FitnessProfile, NutritionProfile } from '@/types/health';
import type { Assessment } from '@/types/consultation';
import type { Notification } from '@/types/platform';
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
  { id: 'goal_energy', userId: USER, organisationId: ORG, category: 'wellbeing', title: 'More daily energy', description: 'Feel energised through the afternoon.', targetValue: 8, unit: '/10', baselineValue: 4, currentValue: 6, targetDate: '2026-09-01', status: 'active', progress: 50 },
  { id: 'goal_hydration', userId: USER, organisationId: ORG, category: 'hydration', title: 'Hit hydration target', description: 'Reach proper cellular hydration daily.', targetValue: 2500, unit: 'ml', baselineValue: 1200, currentValue: 2000, targetDate: '2026-08-01', status: 'active', progress: 62 },
  { id: 'goal_sleep', userId: USER, organisationId: ORG, category: 'sleep', title: 'Sleep 7.5 hours', description: 'Consistent, restorative sleep.', targetValue: 7.5, unit: 'hrs', baselineValue: 5.5, currentValue: 6.5, targetDate: '2026-08-15', status: 'active', progress: 50 },
];

const health: HealthProfile = {
  userId: USER, organisationId: ORG, dateOfBirth: null, biologicalSex: null, heightCm: 172, weightKg: 74,
  bloodType: null, conditions: [], allergies: ['Pollen'], medications: [], emergencyContact: null,
  notes: 'Prototype demo profile — not real health data.', updatedAt: TS,
};
const fitness: FitnessProfile = {
  userId: USER, organisationId: ORG, activityLevel: 'moderate', restingHeartRate: 62, trainingDaysPerWeek: 3,
  baselineMetrics: {}, notes: null,
};
const nutrition: NutritionProfile = {
  userId: USER, organisationId: ORG, dietaryPattern: 'Mostly plant-based', restrictions: [], intolerances: ['Lactose'],
  hydrationTargetMl: 2500, notes: null,
};

const assessments: Assessment[] = [
  { id: 'asmt_mot', userId: USER, organisationId: ORG, type: 'body_mot', status: 'reviewed', title: 'Body MOT', results: { overall: 72 }, score: 72, aiSummary: null, createdBy: USER, reviewedBy: 'usr_practitioner', reviewedAt: TS, createdAt: TS },
  { id: 'asmt_scan', userId: USER, organisationId: ORG, type: 'selfie_scan', status: 'complete', title: 'Remote Selfie Scan', results: { overall: 68 }, score: 68, aiSummary: null, createdBy: USER, reviewedBy: null, reviewedAt: null, createdAt: TS },
];

const notifications: Notification[] = [
  { id: 'ntf_1', organisationId: ORG, userId: USER, type: 'reminder', title: 'Your follow-up is coming up', body: 'Session with Dr. Amara Okoye on Thu 17 Jul.', channel: 'in_app', data: {}, readAt: null, createdAt: TS },
  { id: 'ntf_2', organisationId: ORG, userId: USER, type: 'progress', title: 'Week 3 complete', body: 'Your hydration is trending up — nice work.', channel: 'in_app', data: {}, readAt: TS, createdAt: TS },
];

export interface JourneyEvent { date: string; title: string; description: string; type: 'assessment' | 'session' | 'milestone' | 'programme'; }
export interface Recommendation { title: string; description: string; href: string; }
export interface SavedConversation { id: string; title: string; agent: string; updatedAt: string; preview: string; }
export interface PillarProgress { hydration: number; elimination: number; rest: number; nutrition: number; exercise: number; overall: number; }
export interface UpcomingItem { title: string; when: string; type: string; }

export const member = {
  async goals(): Promise<Result<Goal[]>> { return ok(goals); },
  async healthProfile(): Promise<Result<HealthProfile>> { return ok(health); },
  async fitnessProfile(): Promise<Result<FitnessProfile>> { return ok(fitness); },
  async nutritionProfile(): Promise<Result<NutritionProfile>> { return ok(nutrition); },
  async assessments(): Promise<Result<Assessment[]>> { return ok(assessments); },
  async notifications(): Promise<Result<Notification[]>> { return ok(notifications); },
  async progress(): Promise<Result<PillarProgress>> {
    return ok({ hydration: 78, elimination: 58, rest: 64, nutrition: 70, exercise: 62, overall: 72 });
  },
  async journey(): Promise<Result<JourneyEvent[]>> {
    return ok([
      { date: '6 Jul', title: 'Body MOT completed', description: 'Your baseline across all five pillars.', type: 'assessment' },
      { date: '6 Jul', title: 'Started the 21-Day Reset', description: 'Focusing on hydration and rest first.', type: 'programme' },
      { date: '9 Jul', title: 'First check-in call', description: 'Reviewed early wins with your practitioner.', type: 'session' },
      { date: '10 Jul', title: 'Hydration milestone', description: 'Hit your daily target 5 days running.', type: 'milestone' },
    ]);
  },
  async recommendations(): Promise<Result<Recommendation[]>> {
    return ok([
      { title: 'The five-minute morning hydration ritual', description: 'A simple way to start the day properly hydrated.', href: '/resources/the-five-minute-morning-hydration-ritual' },
      { title: 'Book your follow-up', description: 'Keep your momentum with a check-in.', href: '/book?service=follow-up-session' },
      { title: 'Sleep & Recovery Guide', description: 'Recommended based on your goals.', href: '/resources' },
    ]);
  },
  async savedConversations(): Promise<Result<SavedConversation[]>> {
    return ok([
      { id: 'conv_1', title: 'Afternoon energy dips', agent: 'Juice Doctor Companion', updatedAt: '9 Jul', preview: 'We talked about hydration and blood-sugar stability…' },
      { id: 'conv_2', title: 'Pre-workout nutrition', agent: 'Juice Doctor Companion', updatedAt: '7 Jul', preview: 'What to eat before training for steady energy…' },
    ]);
  },
  async upcoming(): Promise<Result<UpcomingItem[]>> {
    return ok([
      { title: 'Follow-up with Dr. Amara Okoye', when: 'Thu 17 Jul · 4:00pm', type: '1:1' },
      { title: 'Week 4 group check-in', when: 'Mon 21 Jul · 9:00am', type: 'Group' },
    ]);
  },
};
