import { describe, it, expect } from 'vitest';
import { payments, validateAmount, formatAmount } from './payments';
import { getPaymentProvider, isPaymentProviderConfigured } from '@/lib/payments/provider';
import { paymentReference } from './repositories/payments-repo';
import type { InstalmentPlan } from './repositories/payments-repo';

describe('payment provider gating', () => {
  it('has NO provider until one is selected, implemented and credentialed', () => {
    expect(getPaymentProvider()).toBeNull();
    expect(isPaymentProviderConfigured()).toBe(false);
  });
});

describe('amount validation', () => {
  it('accepts only positive integer minor units in supported currencies', () => {
    expect(validateAmount(4900, 'GBP')).toBeNull();
    expect(validateAmount(0, 'GBP')).not.toBeNull();
    expect(validateAmount(-100, 'GBP')).not.toBeNull();
    expect(validateAmount(49.5, 'GBP')).not.toBeNull();
    expect(validateAmount(4900, 'JPY')).not.toBeNull();
    expect(validateAmount(20_000_000, 'GBP')).not.toBeNull();
  });

  it('formats minor units as currency', () => {
    expect(formatAmount(4900, 'GBP')).toBe('£49.00');
  });
});

describe('payment references', () => {
  it('derives a stable human reference from the ledger id — never invented', () => {
    const ref = paymentReference('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(ref).toBe('PAY-A1B2C3D4E5');
    expect(paymentReference('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(ref);
  });
});

describe('outstanding balances', () => {
  const plan: InstalmentPlan = {
    id: 'plan-1',
    memberId: 'member-1',
    customerSubscriptionId: null,
    description: 'Programme',
    currency: 'GBP',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    instalments: [
      { id: 'i1', planId: 'plan-1', sequence: 1, amountMinor: 5000, dueDate: '2020-01-01', status: 'paid', paidPaymentId: 'p1' },
      { id: 'i2', planId: 'plan-1', sequence: 2, amountMinor: 5000, dueDate: '2020-02-01', status: 'pending', paidPaymentId: null },
      { id: 'i3', planId: 'plan-1', sequence: 3, amountMinor: 5000, dueDate: '2999-01-01', status: 'pending', paidPaymentId: null },
      { id: 'i4', planId: 'plan-1', sequence: 4, amountMinor: 5000, dueDate: '2999-02-01', status: 'cancelled', paidPaymentId: null },
    ],
  };

  it('computes paid, due and overdue from real instalment rows only', () => {
    const balance = payments.outstanding(plan);
    expect(balance.paidMinor).toBe(5000);
    expect(balance.dueMinor).toBe(10000);
    expect(balance.overdueMinor).toBe(5000);
  });
});

describe('provider event pipeline honesty', () => {
  it('refuses to process events when the idempotency store is unavailable', async () => {
    // No database in unit tests -> the event store reports unavailable and the
    // pipeline must NOT touch any payment state.
    const result = await payments.processProviderEvent('test-provider', {
      externalEventId: 'evt_1',
      type: 'payment_succeeded',
      providerPaymentId: 'pi_1',
      amountMinor: 4900,
      currency: 'GBP',
      reference: null,
    });
    expect(result.processed).toBe(false);
    expect(result.reason).toBe('event_store_unavailable');
  });
});
