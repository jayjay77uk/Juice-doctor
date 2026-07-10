/**
 * Health domain model — mirrors migration 0006. Highly sensitive data; access is
 * enforced by RLS (owner + treating practitioner/staff) and RBAC (health.read).
 */

export type BiologicalSex = 'male' | 'female' | 'intersex' | 'prefer_not_to_say';
export type QuestionnaireStatus = 'draft' | 'submitted' | 'reviewed';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type GoalCategory =
  | 'hydration'
  | 'nutrition'
  | 'movement'
  | 'sleep'
  | 'weight'
  | 'wellbeing'
  | 'other';
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'abandoned';

export interface HealthProfile {
  userId: string;
  organisationId: string;
  dateOfBirth: string | null;
  biologicalSex: BiologicalSex | null;
  heightCm: number | null;
  weightKg: number | null;
  bloodType: string | null;
  conditions: string[];
  allergies: string[];
  medications: { name: string; dose?: string; frequency?: string }[];
  emergencyContact: { name: string; phone: string; relationship?: string } | null;
  notes: string | null;
  updatedAt: string;
}

export interface MedicalQuestionnaire {
  id: string;
  userId: string;
  organisationId: string;
  templateKey: string;
  title: string;
  status: QuestionnaireStatus;
  answers: Record<string, unknown>;
  score: number | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface FitnessProfile {
  userId: string;
  organisationId: string;
  activityLevel: ActivityLevel;
  restingHeartRate: number | null;
  trainingDaysPerWeek: number | null;
  baselineMetrics: Record<string, number>;
  notes: string | null;
}

export interface NutritionProfile {
  userId: string;
  organisationId: string;
  dietaryPattern: string | null;
  restrictions: string[];
  intolerances: string[];
  hydrationTargetMl: number | null;
  notes: string | null;
}

export interface Goal {
  id: string;
  userId: string;
  organisationId: string;
  category: GoalCategory;
  title: string;
  description: string | null;
  targetValue: number | null;
  unit: string | null;
  baselineValue: number | null;
  currentValue: number | null;
  targetDate: string | null;
  status: GoalStatus;
  progress: number;
}
