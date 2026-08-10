import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import {
  env,
  isAiConfigured,
  isSupabaseAdminConfigured,
  isMailConfigured,
  isSttConfigured,
  isTtsConfigured,
  isSentryConfigured,
  isPosthogConfigured,
  isCronConfigured,
} from '@/lib/env';
import { isWearableProviderConfigured } from '@/services/herne/wearable/provider';
import { connectionStats } from '@/services/herne/wearable/connections';
import { mailStatus } from '@/services/mail';
import { mailRepo } from '@/services/repositories/mail-repo';
import { payments } from '@/services/payments';
import { paymentsRepo } from '@/services/repositories/payments-repo';
import { runLogRepo } from '@/services/repositories/run-log-repo';
import { specialistVoices } from '@/services/voice';
import { EVENT_TAXONOMY } from '@/lib/monitoring/events';
import { HERNE_ORDER } from '@/data/herne/specialist-profiles';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { SpecialistVoicesForm } from '@/components/admin/specialist-voices-form';

export const metadata: Metadata = createMetadata({ title: 'Integrations' });
export const dynamic = 'force-dynamic';

function StatusPill({ state, label }: { state: 'connected' | 'not_configured' | 'pending'; label?: string }) {
  const styles =
    state === 'connected'
      ? 'bg-secondary/10 text-secondary'
      : state === 'pending'
        ? 'bg-primary/10 text-primary'
        : 'bg-surface-muted text-muted-foreground';
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {label ?? (state === 'connected' ? 'Connected' : state === 'pending' ? 'Pending' : 'Not configured')}
    </span>
  );
}

interface Row {
  name: string;
  state: 'connected' | 'not_configured' | 'pending';
  stateLabel?: string;
  detail: string;
  requirements?: string;
}

export default async function IntegrationsPage() {
  const [mail, outbox, paymentStatus, webhookEvents, wearableStats, lastRuns, voices] = await Promise.all([
    mailStatus(),
    mailRepo.recent(5),
    payments.status(),
    paymentsRepo.webhookEvents.recent(undefined, 5),
    connectionStats(),
    runLogRepo.recent(1),
    specialistVoices(),
  ]);
  const lastRunAt = lastRuns[0]?.created_at ? String(lastRuns[0].created_at) : null;
  const customDomainSet = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

  const rows: Row[] = [
    {
      name: 'Supabase (database + auth)',
      state: isSupabaseAdminConfigured() ? 'connected' : 'not_configured',
      detail: isSupabaseAdminConfigured() ? 'Service-role and user clients operational.' : 'Set the Supabase URL and keys.',
    },
    {
      name: 'Anthropic (Claude)',
      state: isAiConfigured() ? 'connected' : 'not_configured',
      detail: isAiConfigured()
        ? `Model ${env.aiModel}. Last AI run: ${lastRunAt ? new Date(lastRunAt).toLocaleString('en-GB') : 'none yet'}.`
        : 'Set ANTHROPIC_API_KEY.',
    },
    {
      name: 'Email (Resend)',
      state: mail.configured ? 'connected' : 'not_configured',
      detail: mail.configured
        ? `Sending as ${mail.addresses.from}.`
        : mail.outboxAvailable
          ? `Not connected — ${(mail.counts.blocked ?? 0) + (mail.counts.queued ?? 0)} email(s) waiting in the outbox.`
          : 'Not connected. Outbox storage additionally needs migration 0031.',
      requirements: 'RESEND_API_KEY, MAIL_FROM_ADDRESS (+ CONTACT_INBOX_ADDRESS, STAFF_ALERTS_ADDRESS, MAIL_REPLY_TO_ADDRESS)',
    },
    {
      name: 'Thryve (wearables)',
      state: isWearableProviderConfigured() ? 'connected' : 'not_configured',
      detail: `Member connections: ${Object.entries(wearableStats.byStatus).map(([s, c]) => `${s} ${c}`).join(', ') || 'none'}. Last sync: ${wearableStats.lastSyncAt ? new Date(wearableStats.lastSyncAt).toLocaleString('en-GB') : 'never'}. Contract-dependent mapping documented in docs/integrations/thryve.md.`,
      requirements: 'THRYVE_API_KEY, THRYVE_APP_ID, THRYVE_WEBHOOK_SECRET',
    },
    {
      name: 'Deepgram (voice input)',
      state: isSttConfigured() ? 'connected' : 'not_configured',
      detail: isSttConfigured() ? 'Members can dictate messages.' : 'Voice input shows an honest unavailable state.',
      requirements: 'DEEPGRAM_API_KEY',
    },
    {
      name: 'ElevenLabs (read-aloud)',
      state: isTtsConfigured() ? 'connected' : 'not_configured',
      detail: `${Object.keys(voices).length} specialist voice(s) configured below; a default voice id is required to connect.`,
      requirements: 'ELEVENLABS_API_KEY, ELEVENLABS_DEFAULT_VOICE_ID',
    },
    {
      name: 'Sentry (error monitoring)',
      state: isSentryConfigured() ? 'connected' : 'not_configured',
      detail: isSentryConfigured() ? 'Server errors are captured.' : 'Errors log to the server console only.',
      requirements: 'SENTRY_DSN',
    },
    {
      name: 'PostHog (product analytics)',
      state: isPosthogConfigured() ? 'connected' : 'not_configured',
      detail: `${EVENT_TAXONOMY.length} operational events instrumented (content-free by construction). Internal AI cost/reliability analytics run regardless.`,
      requirements: 'POSTHOG_API_KEY (+ POSTHOG_HOST)',
    },
    {
      name: 'Payment provider',
      state: paymentStatus.configured ? 'connected' : 'not_configured',
      ...(paymentStatus.configured ? {} : { stateLabel: paymentStatus.selectedProvider ? `"${paymentStatus.selectedProvider}" pending` : 'Not selected' }),
      detail: `${paymentStatus.summary.count} ledger entr(ies), all manual records. Webhook events: ${webhookEvents.available ? webhookEvents.rows.length : 'store requires migration 0031'}. Nothing is ever marked paid automatically.`,
      requirements: 'Client provider decision, then the adapter + PAYMENT_PROVIDER + its credentials',
    },
    {
      name: 'Background jobs (scheduler)',
      state: isCronConfigured() ? 'connected' : 'not_configured',
      detail: isCronConfigured()
        ? 'Scheduler authenticated; daily Vercel cron hits /api/jobs/run (see vercel.json).'
        : 'The runner answers 503 until CRON_SECRET is set; the daily Vercel cron is already declared in vercel.json.',
      requirements: 'CRON_SECRET',
    },
    {
      name: 'Custom domain',
      state: customDomainSet ? 'connected' : 'pending',
      stateLabel: customDomainSet ? 'Set' : 'Pending',
      detail: `Canonical origin: ${env.siteUrl}. The final domain is one env change (NEXT_PUBLIC_SITE_URL) + Vercel domain assignment + Supabase auth URL update.`,
      requirements: 'Client domain, DNS at the registrar, NEXT_PUBLIC_SITE_URL',
    },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader
        title="Integrations"
        description="Real configuration state of every external service — nothing here is simulated. Each unconnected provider lists exactly what the final connection stage needs."
        breadcrumbs={[{ label: 'Integrations' }]}
      />

      <Panel padded={false}>
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.name} className="flex flex-col gap-1 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{row.name}</span>
                <StatusPill state={row.state} {...(row.stateLabel ? { label: row.stateLabel } : {})} />
              </div>
              <p className="text-sm text-muted-foreground">{row.detail}</p>
              {row.requirements && row.state !== 'connected' && (
                <p className="text-xs text-muted-foreground">
                  Requires: <span className="font-mono">{row.requirements}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Recent outbox activity"
        description="What the platform tried to send. Blocked rows deliver automatically once email is connected."
        padded={false}
      >
        {!outbox.available ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">Outbox storage requires database migration 0031 — mail attempts are honestly reported as undeliverable meanwhile.</p>
        ) : outbox.rows.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">No mail activity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {outbox.rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                <span className="min-w-0 truncate text-foreground">
                  {row.template} → {row.toAddress}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{row.status}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{new Date(row.createdAt).toLocaleString('en-GB')}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Specialist voices (ElevenLabs)"
        description="Voice id per specialist — saved now, spoken once ElevenLabs is connected. Unset specialists use the platform default voice."
      >
        <SpecialistVoicesForm specialists={[...HERNE_ORDER]} voices={voices} />
      </Panel>
    </div>
  );
}
