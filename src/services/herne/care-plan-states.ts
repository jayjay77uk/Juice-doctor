/**
 * HERNE care-plan action state machine (PURE — unit-tested). A specialist PROPOSES
 * an action; the person accepts or declines it; accepted actions become active, then
 * completed. Actions can be superseded (replaced) or flagged for human review. Only
 * legal transitions are allowed, so a declined or superseded action can never be
 * force-completed.
 */

export type ActionStatus =
  | 'proposed'
  | 'user_accepted'
  | 'active'
  | 'completed'
  | 'declined'
  | 'superseded'
  | 'requires_human_review';

export const TERMINAL_STATUSES: ActionStatus[] = ['completed', 'declined', 'superseded'];
export const NON_TERMINAL_STATUSES: ActionStatus[] = ['proposed', 'user_accepted', 'active', 'requires_human_review'];

const TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  proposed: ['user_accepted', 'declined', 'superseded', 'requires_human_review'],
  user_accepted: ['active', 'declined', 'superseded'],
  active: ['completed', 'superseded', 'requires_human_review'],
  requires_human_review: ['active', 'declined', 'superseded'],
  completed: [],
  declined: [],
  superseded: [],
};

export function canTransition(from: ActionStatus, to: ActionStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(status: ActionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  proposed: 'Proposed',
  user_accepted: 'Accepted',
  active: 'Active',
  completed: 'Completed',
  declined: 'Declined',
  superseded: 'Superseded',
  requires_human_review: 'Needs human review',
};

/** Grouping for the care-plan dashboard. */
export function statusGroup(status: ActionStatus): 'awaiting_you' | 'in_progress' | 'done' | 'attention' {
  if (status === 'proposed') return 'awaiting_you';
  if (status === 'user_accepted' || status === 'active') return 'in_progress';
  if (status === 'requires_human_review') return 'attention';
  return 'done';
}
