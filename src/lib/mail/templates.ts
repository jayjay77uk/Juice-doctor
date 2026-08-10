import 'server-only';

import { APP_NAME } from '@/config/app';
import { env } from '@/lib/env';

/**
 * Typed email templates — every outbound email the platform can send is
 * composed here, from structured parameters only. Privacy rule: templates
 * carry OPERATIONAL facts (names, dates, references, links) and never
 * conversation content, health details or care-plan content.
 */

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(title: string, lines: string[]): { text: string; html: string } {
  const text = `${title}\n\n${lines.join('\n')}\n\n— ${APP_NAME}\n${env.siteUrl}`;
  const html = [
    `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">`,
    `<h2 style="font-size:18px;margin:0 0 16px">${escapeHtml(title)}</h2>`,
    ...lines.map((l) => `<p style="font-size:14px;line-height:1.6;margin:0 0 10px">${escapeHtml(l)}</p>`),
    `<p style="font-size:12px;color:#6b7280;margin-top:24px">— ${escapeHtml(APP_NAME)} · <a href="${env.siteUrl}" style="color:#6b7280">${env.siteUrl}</a></p>`,
    `</div>`,
  ].join('');
  return { text, html };
}

const dt = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/London' });

/** Parameter shapes per template — the compiler enforces complete render calls. */
export interface MailTemplateParams {
  'contact.staff_copy': { name: string; email: string; subject: string; message: string };
  'newsletter.welcome': Record<string, never>;
  'account.welcome': { name: string };
  'account.invitation': { role: string; setupUrl: string };
  'appointment.requested': { service: string; startIso: string; location: string };
  'appointment.confirmed': { service: string; startIso: string; location: string };
  'appointment.cancelled': { service: string; startIso: string };
  'appointment.rescheduled': { service: string; startIso: string; location: string };
  'appointment.reminder': { service: string; startIso: string; location: string };
  'crm.follow_up_due': { leadName: string; leadId: string; dueIso: string };
  'escalation.staff_alert': { specialist: string; leadId: string | null };
  'subscription.state_changed': { planName: string; state: string };
  'payment.recorded': { reference: string; amountFormatted: string; description: string };
}

export type MailTemplateKey = keyof MailTemplateParams;

export interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

type Renderers = { [K in MailTemplateKey]: (p: MailTemplateParams[K]) => RenderedMail };

const renderers: Renderers = {
  'contact.staff_copy': (p) => ({
    subject: `New contact message: ${p.subject || '(no subject)'}`,
    ...layout('New contact-form message', [
      `From: ${p.name} <${p.email}>`,
      `Subject: ${p.subject || '(no subject)'}`,
      '',
      p.message,
    ]),
  }),
  'newsletter.welcome': () => ({
    subject: `You're subscribed to ${APP_NAME} updates`,
    ...layout("You're subscribed", [
      `Thanks for subscribing to ${APP_NAME} updates. You can unsubscribe at any time by replying to any email.`,
    ]),
  }),
  'account.welcome': (p) => ({
    subject: `Welcome to ${APP_NAME}`,
    ...layout(`Welcome, ${p.name}`, [
      `Your ${APP_NAME} account is ready. Sign in any time to talk to the care team.`,
      `Sign in: ${env.siteUrl}/login`,
    ]),
  }),
  'account.invitation': (p) => ({
    subject: `You've been invited to ${APP_NAME}`,
    ...layout(`Your ${APP_NAME} account`, [
      `An administrator has created a ${p.role} account for you.`,
      `Set your password using this secure link (it expires):`,
      p.setupUrl,
    ]),
  }),
  'appointment.requested': (p) => ({
    subject: 'Your appointment request was received',
    ...layout('Appointment requested', [
      `Service: ${p.service}`,
      `When: ${dt(p.startIso)}`,
      `How: ${p.location}`,
      'The team will confirm your appointment shortly. You can manage it from your dashboard.',
    ]),
  }),
  'appointment.confirmed': (p) => ({
    subject: 'Your appointment is confirmed',
    ...layout('Appointment confirmed', [
      `Service: ${p.service}`,
      `When: ${dt(p.startIso)}`,
      `How: ${p.location}`,
    ]),
  }),
  'appointment.cancelled': (p) => ({
    subject: 'Your appointment was cancelled',
    ...layout('Appointment cancelled', [
      `Service: ${p.service}`,
      `Original time: ${dt(p.startIso)}`,
      'You can book a new time from your dashboard whenever suits you.',
    ]),
  }),
  'appointment.rescheduled': (p) => ({
    subject: 'Your appointment was rescheduled',
    ...layout('Appointment rescheduled', [
      `Service: ${p.service}`,
      `New time: ${dt(p.startIso)}`,
      `How: ${p.location}`,
    ]),
  }),
  'appointment.reminder': (p) => ({
    subject: 'Reminder: your appointment is coming up',
    ...layout('Appointment reminder', [
      `Service: ${p.service}`,
      `When: ${dt(p.startIso)}`,
      `How: ${p.location}`,
    ]),
  }),
  'crm.follow_up_due': (p) => ({
    subject: `Follow-up due: ${p.leadName}`,
    ...layout('CRM follow-up due', [
      `Lead: ${p.leadName}`,
      `Due: ${dt(p.dueIso)}`,
      `Open the lead: ${env.siteUrl}/admin/crm/${p.leadId}`,
    ]),
  }),
  'escalation.staff_alert': (p) => ({
    subject: 'A member conversation was escalated for human review',
    ...layout('Escalation — human review needed', [
      `Escalated by: ${p.specialist}`,
      p.leadId ? `Review queue lead: ${env.siteUrl}/admin/crm/${p.leadId}` : `Review queue: ${env.siteUrl}/admin/herne/referrals`,
      'Details are in the admin area — this alert deliberately contains no member or conversation content.',
    ]),
  }),
  'subscription.state_changed': (p) => ({
    subject: `Your ${APP_NAME} subscription was updated`,
    ...layout('Subscription updated', [
      `Plan: ${p.planName}`,
      `Status: ${p.state}`,
      `See details in your dashboard: ${env.siteUrl}/dashboard/subscription`,
    ]),
  }),
  'payment.recorded': (p) => ({
    subject: `Payment received — ${p.reference}`,
    ...layout('Payment recorded', [
      `Reference: ${p.reference}`,
      `Amount: ${p.amountFormatted}`,
      `For: ${p.description}`,
      'This is a record of a payment the team has logged against your account.',
    ]),
  }),
};

export function renderMailTemplate<K extends MailTemplateKey>(key: K, params: MailTemplateParams[K]): RenderedMail {
  return renderers[key](params);
}
