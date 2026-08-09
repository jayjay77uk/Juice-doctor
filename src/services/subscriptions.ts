import 'server-only';

import { subscriptionsRepo } from './repositories/subscriptions-repo';

/**
 * Subscriptions — admin-configurable plans + customer subscriptions over
 * subscription_plans / customer_subscriptions / subscription_payments (migration
 * 0027). Payments are MANUAL RECORDS by design (no live payment provider is
 * configured), so no card data ever exists here. No mock data.
 */

export const subscriptionsService = subscriptionsRepo;
