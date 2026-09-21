import { ROLE_RANK, type AppRole } from './roles';

/** Owner/peer changes need a separate recovery workflow, never this form. */
export function mayManageUser(
  actor: { id: string; role: AppRole; organisationId: string | null },
  target: { id: string; role: AppRole; organisationId: string | null },
  nextRole: AppRole,
): boolean {
  return Boolean(actor.organisationId && actor.organisationId === target.organisationId &&
    actor.id !== target.id && ROLE_RANK[actor.role] >= ROLE_RANK.administrator &&
    ROLE_RANK[target.role] < ROLE_RANK[actor.role] &&
    nextRole !== 'guest' && ROLE_RANK[nextRole] < ROLE_RANK[actor.role]);
}
