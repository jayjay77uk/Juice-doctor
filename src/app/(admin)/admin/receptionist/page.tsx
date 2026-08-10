import Link from 'next/link';
import { Sparkles, TrendingUp, ShieldAlert, Gauge } from 'lucide-react';

import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { EmptyState } from '@/components/admin/empty-state';
import { ReceptionistSettingsForm } from '@/components/admin/receptionist-settings-form';
import { Button } from '@/components/ui/button';
import { receptionist } from '@/services/receptionist';
import { crm } from '@/services/crm';

export const metadata = createMetadata({ title: 'The Receptionist AI' });

const percent = (value: number) => `${Math.round(value * 100)}%`;

export default async function ReceptionistPage() {
  const [agentResult, statsResult, settingsResult, escalationResult] = await Promise.all([
    receptionist.agent(),
    receptionist.stats(),
    receptionist.settings(),
    crm.escalationQueue(),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="The Receptionist AI"
        description="Your AI front door — it consults every visitor, recommends a specialist, and escalates to a human when unsure."
        actions={
          agentResult.ok ? (
            <Button asChild size="sm">
              <Link href={`/admin/ai/agents/${agentResult.data.id}`}>Edit agent identity</Link>
            </Button>
          ) : undefined
        }
      />

      {statsResult.ok && (
        <StatGrid>
          <StatCard label="Consultations (30d)" value={statsResult.data.consultations30d.toLocaleString('en-GB')} icon={Sparkles} />
          <StatCard label="Recommendation rate" value={percent(statsResult.data.recommendationRate)} icon={TrendingUp} />
          <StatCard label="Escalation rate" value={percent(statsResult.data.escalationRate)} icon={ShieldAlert} />
          <StatCard label="Avg confidence" value={percent(statsResult.data.avgConfidence)} icon={Gauge} />
        </StatGrid>
      )}

      <Panel
        title="Settings"
        description="Manage how the Receptionist AI greets visitors, what it asks, when it escalates, and how it hands off. These are temporary settings, not final approved rules."
      >
        {settingsResult.ok ? (
          <ReceptionistSettingsForm settings={settingsResult.data} />
        ) : (
          <p className="text-sm text-muted-foreground">{settingsResult.error.message}</p>
        )}
      </Panel>

      <Panel title="Identity" description="How the Receptionist AI presents itself to every visitor.">
        {agentResult.ok ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</span>
              <p className="text-sm text-foreground">{agentResult.data.role}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</span>
              <p className="text-sm text-foreground">{agentResult.data.description}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">System prompt</span>
              <pre className="overflow-x-auto rounded-lg bg-surface-muted p-4 text-xs text-foreground whitespace-pre-wrap">
                {agentResult.data.systemPrompt}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{agentResult.error.message}</p>
        )}
      </Panel>

      <Panel
        title="Escalation queue"
        description="Visitors the Receptionist AI handed off to a human because it was not confident enough."
        padded={false}
      >
        {escalationResult.ok ? (
          escalationResult.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {escalationResult.data.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/admin/crm/${lead.id}`}
                    className="flex flex-col gap-1 px-6 py-4 transition-colors hover:bg-surface-muted"
                  >
                    <span className="text-sm font-medium text-foreground">{lead.name}</span>
                    <span className="text-sm text-muted-foreground">{lead.assessmentSummary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={ShieldAlert}
                title="No escalations right now"
                description="The Receptionist AI is confidently routing every visitor to a specialist."
              />
            </div>
          )
        ) : (
          <p className="px-6 py-4 text-sm text-muted-foreground">{escalationResult.error.message}</p>
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">
        Live data from the platform database. AI replies run on the live model and are not clinically reviewed. No payment provider is connected.
      </p>
    </div>
  );
}
