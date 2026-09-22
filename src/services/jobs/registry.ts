import 'server-only';

import { crmRepo } from '../repositories/crm-repo';
import { appointmentsAdminRepo } from '../repositories/appointments-admin-repo';
import { paymentsRepo } from '../repositories/payments-repo';
import { subscriptionsRepo } from '../repositories/subscriptions-repo';
import { deliverPendingMail, sendTemplateMail } from '../mail';
import { businessAddresses } from '@/config/addresses';
import { isWearableProviderConfigured } from '../herne/wearable/provider';
import { listConnections, resyncForUser } from '../herne/wearable/connections';
import { consultations } from '@/content/programmes';
import { memberFollowups } from './member-followups';
import { createAdminClient } from '@/lib/supabase/admin';
import { featureFlags } from '../feature-flags';

/**
 * Background-job registry — the work an external scheduler triggers through
 * /api/jobs/run. Design rules:
 *  - Every job is IDEMPOTENT: reminder emails carry dedupe keys, so a rerun
 *    never double-queues; syncs go through the duplicate-safe ingest engine.
 *  - Jobs never fake work: a job that cannot run (provider unconnected, table
 *    unapplied) reports `skipped` with the reason, never a pretend success.
 *  - Nothing here changes payment or subscription states automatically —
 *    reporting only, by design.
 */

export interface JobResult {
  name: string;
  status: 'ran' | 'skipped';
  processed: number;
  detail: string;
}

const LOCATION_LABELS: Record<string, string> = {
  video: 'Video call',
  phone: 'Phone call',
  in_person: 'In person',
};

async function crmFollowUpReminders(): Promise<JobResult> {
  const name = 'crm-follow-up-reminders';
  const { staffAlerts } = businessAddresses();
  const due = await crmRepo.dueReminders();
  if (!due.ok) return { name, status: 'skipped', processed: 0, detail: 'CRM unavailable.' };
  if (!due.data.length) return { name, status: 'ran', processed: 0, detail: 'No due follow-ups.' };
  if (!staffAlerts) {
    return {
      name,
      status: 'skipped',
      processed: 0,
      detail: `${due.data.length} due follow-up(s), but no STAFF_ALERTS_ADDRESS is configured.`,
    };
  }
  let queued = 0;
  for (const lead of due.data) {
    if (!lead.reminderAt) continue;
    const result = await sendTemplateMail({
      to: staffAlerts,
      template: 'crm.follow_up_due',
      params: { leadName: lead.name, leadId: lead.id, dueIso: lead.reminderAt },
      dedupeKey: `crm-reminder:${lead.id}:${lead.reminderAt}`,
    });
    if (result.recorded && result.reason !== 'duplicate') queued += 1;
  }
  return {
    name,
    status: 'ran',
    processed: queued,
    detail: `${queued} reminder email(s) queued (${due.data.length} due).`,
  };
}

async function appointmentReminders(): Promise<JobResult> {
  const name = 'appointment-reminders';
  const upcoming = await appointmentsAdminRepo.confirmedWithin(24);
  if (!upcoming.length)
    return {
      name,
      status: 'ran',
      processed: 0,
      detail: 'No confirmed appointments in the next 24 hours.',
    };
  let queued = 0;
  for (const appt of upcoming) {
    if (!appt.memberEmail) continue;
    const service =
      consultations.find((c) => c.slug === appt.serviceSlug)?.title ??
      appt.serviceSlug.replaceAll('-', ' ');
    const result = await sendTemplateMail({
      to: appt.memberEmail,
      template: 'appointment.reminder',
      params: {
        service,
        startIso: appt.scheduledStart,
        location: LOCATION_LABELS[appt.locationType] ?? appt.locationType,
      },
      dedupeKey: `appt-reminder:${appt.id}:${appt.scheduledStart}`,
    });
    if (result.recorded && result.reason !== 'duplicate') queued += 1;
  }
  return {
    name,
    status: 'ran',
    processed: queued,
    detail: `${queued} reminder email(s) queued (${upcoming.length} upcoming).`,
  };
}

async function instalmentOverdueCheck(): Promise<JobResult> {
  const name = 'instalment-overdue-check';
  const plans = await paymentsRepo.instalments.list({ all: true });
  if (!plans.available) {
    return {
      name,
      status: 'skipped',
      processed: 0,
      detail: 'Instalment tables not available (migration 0031 pending).',
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  let overdue = 0;
  let queued = 0;
  const sb = createAdminClient();
  const remindersEnabled = await featureFlags.isEnabled('platform.notifications');
  for (const plan of plans.plans) {
    if (plan.status !== 'active') continue;
    overdue += plan.instalments.filter((i) => i.status === 'pending' && i.dueDate < today).length;
    if (!sb || !remindersEnabled) continue;
    const profile = await sb
      .from('profiles')
      .select('id')
      .eq('id', plan.memberId)
      .eq('status', 'active')
      .maybeSingle();
    if (profile.error || !profile.data) continue;
    const auth = await sb.auth.admin.getUserById(plan.memberId);
    const user = auth.data.user;
    if (auth.error || !user?.email_confirmed_at || !user.email) continue;
    for (const instalment of plan.instalments.filter(
      (i) => i.status === 'pending' && i.dueDate <= today,
    )) {
      const result = await sendTemplateMail({
        to: user.email,
        template: 'payment.instalment_reminder',
        params: { dueDate: instalment.dueDate },
        dedupeKey: `instalment:${instalment.id}:${today}`,
      });
      if (result.recorded && result.reason !== 'duplicate') queued++;
    }
  }
  return {
    name,
    status: 'ran',
    processed: queued,
    detail: `${overdue} overdue instalment(s); ${queued} new reminder(s) recorded. Payment states are unchanged.`,
  };
}

async function subscriptionStateReport(): Promise<JobResult> {
  const name = 'subscription-state-report';
  const summary = await subscriptionsRepo.summary();
  if (!summary.ok)
    return { name, status: 'skipped', processed: 0, detail: 'Subscriptions unavailable.' };
  return {
    name,
    status: 'ran',
    processed: summary.data.pastDue,
    detail: `${summary.data.active} active, ${summary.data.pastDue} past-due/incomplete, ${summary.data.canceled} cancelled. States change only by admin action or verified payment events.`,
  };
}

async function mailOutboxDelivery(): Promise<JobResult> {
  const name = 'mail-outbox-delivery';
  const result = await deliverPendingMail();
  if (!result.available)
    return {
      name,
      status: 'skipped',
      processed: 0,
      detail: 'Outbox table not available (migration 0031 pending).',
    };
  if (result.sent === 0 && result.failed === 0) {
    return {
      name,
      status: 'ran',
      processed: 0,
      detail:
        result.pending > 0
          ? `${result.pending} email(s) waiting for the email provider.`
          : 'Outbox empty.',
    };
  }
  return {
    name,
    status: 'ran',
    processed: result.sent,
    detail: `${result.sent} sent, ${result.failed} failed.`,
  };
}

async function wearableScheduledSync(): Promise<JobResult> {
  const name = 'wearable-scheduled-sync';
  if (!isWearableProviderConfigured()) {
    return { name, status: 'skipped', processed: 0, detail: 'Wearable provider not configured.' };
  }
  const connections = (await listConnections(100)).filter((c) => c.status === 'active');
  let synced = 0;
  let failed = 0;
  for (const conn of connections) {
    const result = await resyncForUser(conn.userId);
    if (result.ok) synced += 1;
    else failed += 1;
  }
  return {
    name,
    status: 'ran',
    processed: synced,
    detail: `${synced} connection(s) synced, ${failed} failed (recorded as sync jobs).`,
  };
}

export const JOBS: Record<string, () => Promise<JobResult>> = {
  'member-follow-ups': memberFollowups,
  'crm-follow-up-reminders': crmFollowUpReminders,
  'appointment-reminders': appointmentReminders,
  'instalment-overdue-check': instalmentOverdueCheck,
  'subscription-state-report': subscriptionStateReport,
  'mail-outbox-delivery': mailOutboxDelivery,
  'wearable-scheduled-sync': wearableScheduledSync,
};

export async function runJobs(only?: string): Promise<JobResult[]> {
  const names = only ? Object.keys(JOBS).filter((n) => n === only) : Object.keys(JOBS);
  const results: JobResult[] = [];
  for (const jobName of names) {
    try {
      results.push(await JOBS[jobName]!());
    } catch (e) {
      results.push({
        name: jobName,
        status: 'skipped',
        processed: 0,
        detail: `Error: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown'}`,
      });
    }
  }
  return results;
}
