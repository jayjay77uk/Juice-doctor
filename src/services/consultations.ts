import 'server-only';

import {
  CONSULTATION_STAGES,
  type Appointment,
  type Assessment,
  type Consultation,
  type ConsultationStage,
} from '@/types/consultation';
import { ok, type Page, type Result } from './result';
import type { ListQuery } from './index';

/**
 * Consultation stage-machine reference. NOTHING in the live app imports this
 * module today: live consultation reads/writes go through
 * `repositories/consultations-repo.ts` (the 0007 tables), which carries its own
 * stage ordering. `nextStage` and the list methods below are unused legacy
 * stubs kept only as the documented pipeline reference (intake → assessment →
 * ai_review → practitioner_review → appointment → follow_up → history).
 */

/** The next stage in the linear pipeline, or null at the end. */
export function nextStage(stage: ConsultationStage): ConsultationStage | null {
  const idx = CONSULTATION_STAGES.indexOf(stage);
  if (idx < 0 || idx >= CONSULTATION_STAGES.length - 1) return null;
  return CONSULTATION_STAGES[idx + 1] ?? null;
}

export const consultations = {
  stages: CONSULTATION_STAGES,
  nextStage,

  assessments: {
    async listForUser(_userId: string, _q: ListQuery = {}): Promise<Result<Page<Assessment>>> {
      return ok({ items: [], nextCursor: null });
    },
  },
  appointments: {
    async listForUser(_userId: string, _q: ListQuery = {}): Promise<Result<Page<Appointment>>> {
      return ok({ items: [], nextCursor: null });
    },
  },
  records: {
    async listForUser(_userId: string, _q: ListQuery = {}): Promise<Result<Page<Consultation>>> {
      return ok({ items: [], nextCursor: null });
    },
  },
};
