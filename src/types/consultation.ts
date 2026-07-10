/**
 * Consultation workflow model — mirrors migration 0007. Encodes the pipeline
 * intake → assessment → AI review → practitioner review → appointment →
 * follow-up → history as a set of records plus an append-only event timeline.
 */

export type AssessmentType = 'intake' | 'body_mot' | 'selfie_scan' | 'health_questionnaire';
export type AssessmentStatus = 'pending' | 'in_progress' | 'complete' | 'reviewed';
export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';
export type AppointmentLocation = 'in_person' | 'video' | 'phone';
export type ConsultationStatus =
  | 'scheduled'
  | 'in_progress'
  | 'awaiting_review'
  | 'completed'
  | 'cancelled';
/** The ordered stages a consultation moves through. */
export type ConsultationStage =
  | 'intake'
  | 'assessment'
  | 'ai_review'
  | 'practitioner_review'
  | 'appointment'
  | 'follow_up'
  | 'history';
export type FollowUpStatus = 'pending' | 'sent' | 'completed' | 'cancelled';

export const CONSULTATION_STAGES: ConsultationStage[] = [
  'intake',
  'assessment',
  'ai_review',
  'practitioner_review',
  'appointment',
  'follow_up',
  'history',
];

export interface Assessment {
  id: string;
  userId: string;
  organisationId: string;
  type: AssessmentType;
  status: AssessmentStatus;
  title: string;
  results: Record<string, unknown>;
  score: number | null;
  /** Placeholder for future AI-generated summary (Phase 3). Null now. */
  aiSummary: string | null;
  createdBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface Appointment {
  id: string;
  organisationId: string;
  clinicId: string | null;
  memberId: string;
  practitionerId: string | null;
  serviceSlug: string;
  status: AppointmentStatus;
  locationType: AppointmentLocation;
  scheduledStart: string;
  scheduledEnd: string;
  notes: string | null;
  createdAt: string;
}

export interface Consultation {
  id: string;
  organisationId: string;
  appointmentId: string | null;
  memberId: string;
  practitionerId: string | null;
  status: ConsultationStatus;
  reason: string | null;
  /** Placeholder for future AI review payload. Null now. */
  aiReview: Record<string, unknown> | null;
  practitionerNotes: string | null;
  summary: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface ConsultationEvent {
  id: string;
  consultationId: string;
  stage: ConsultationStage;
  actorId: string | null;
  title: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  consultationId: string;
  memberId: string;
  organisationId: string;
  dueDate: string;
  status: FollowUpStatus;
  channel: string | null;
  notes: string | null;
}
