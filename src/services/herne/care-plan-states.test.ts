import { describe, it, expect } from 'vitest';
import { canTransition, isTerminal, statusGroup, TERMINAL_STATUSES, NON_TERMINAL_STATUSES } from './care-plan-states';

describe('HERNE care-plan action state machine', () => {
  it('allows the proposal → accepted → active → completed happy path', () => {
    expect(canTransition('proposed', 'user_accepted')).toBe(true);
    expect(canTransition('user_accepted', 'active')).toBe(true);
    expect(canTransition('active', 'completed')).toBe(true);
  });

  it('allows a person to decline a proposal', () => {
    expect(canTransition('proposed', 'declined')).toBe(true);
  });

  it('forbids illegal jumps (e.g. proposed → completed, or reviving a declined action)', () => {
    expect(canTransition('proposed', 'completed')).toBe(false);
    expect(canTransition('declined', 'active')).toBe(false);
    expect(canTransition('completed', 'active')).toBe(false);
    expect(canTransition('superseded', 'completed')).toBe(false);
  });

  it('marks terminal vs non-terminal states correctly', () => {
    expect(TERMINAL_STATUSES.sort()).toEqual(['completed', 'declined', 'superseded']);
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('proposed')).toBe(false);
    for (const s of NON_TERMINAL_STATUSES) expect(isTerminal(s)).toBe(false);
  });

  it('groups states for the dashboard', () => {
    expect(statusGroup('proposed')).toBe('awaiting_you');
    expect(statusGroup('active')).toBe('in_progress');
    expect(statusGroup('completed')).toBe('done');
    expect(statusGroup('requires_human_review')).toBe('attention');
  });
});
