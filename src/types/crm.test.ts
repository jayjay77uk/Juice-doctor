import { describe, it, expect } from 'vitest';
import { LEAD_STATUS_ORDER, LEAD_STATUS_PROGRESS, LEAD_STATUS_LABELS } from './crm';

describe('CRM lead status model', () => {
  it('derives a progress value for every status (never fabricated elsewhere)', () => {
    for (const status of LEAD_STATUS_ORDER) {
      expect(LEAD_STATUS_PROGRESS[status]).toBeGreaterThanOrEqual(0);
      expect(LEAD_STATUS_PROGRESS[status]).toBeLessThanOrEqual(100);
      expect(LEAD_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('progress is monotonic along the active journey and terminal at closed', () => {
    const journey = ['new', 'consultation', 'human_review', 'recommended', 'awaiting_subscription', 'subscribed', 'active', 'follow_up'] as const;
    for (let i = 1; i < journey.length; i++) {
      expect(LEAD_STATUS_PROGRESS[journey[i]!]).toBeGreaterThan(LEAD_STATUS_PROGRESS[journey[i - 1]!]);
    }
    expect(LEAD_STATUS_PROGRESS.closed).toBe(100);
    expect(LEAD_STATUS_PROGRESS.inactive).toBe(0);
  });
});
