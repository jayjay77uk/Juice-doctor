import Link from 'next/link'
import { Sparkles, TrendingUp, ShieldAlert, Gauge } from 'lucide-react'

import { createMetadata } from '@/config/metadata'
import { AdminHeader } from '@/components/admin/admin-header'
import { Panel } from '@/components/admin/panel'
import { StatGrid, StatCard } from '@/components/admin/stat-card'
import { EmptyState } from '@/components/admin/empty-state'
import { Button } from '@/components/ui/button'
import { receptionist, CONFIDENCE_THRESHOLD } from '@/services/receptionist'
import { crm } from '@/services/crm'

export const metadata = createMetadata({ title: 'The Receptionist AI' })

const percent = (value: number) => `${Math.round(value * 100)}%`

export default async function ReceptionistPage() {
  const [agentResult, statsResult, escalationResult] = await Promise.all([
    receptionist.agent(),
    receptionist.stats(),
    crm.escalationQueue(),
  ])

  const questions = receptionist.questions

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="The Receptionist AI"
        description="Your AI front door — it consults every visitor, recommends a specialist, and escalates to a human when unsure."
        actions={
          agentResult.ok ? (
            <Button asChild size="sm">
              <Link href={`/admin/ai/agents/${agentResult.data.id}`}>Edit configuration</Link>
            </Button>
          ) : undefined
        }
      />

      {statsResult.ok ? (
        <StatGrid>
          <StatCard
            label="Consultations (30d)"
            value={statsResult.data.consultations30d.toLocaleString('en-GB')}
            icon={Sparkles}
          />
          <StatCard
            label="Recommendation rate"
            value={percent(statsResult.data.recommendationRate)}
            icon={TrendingUp}
          />
          <StatCard
            label="Escalation rate"
            value={percent(statsResult.data.escalationRate)}
            icon={ShieldAlert}
          />
          <StatCard
            label="Avg confidence"
            value={percent(statsResult.data.avgConfidence)}
            icon={Gauge}
          />
        </StatGrid>
      ) : (
        <Panel title="Stats">
          <p className="text-sm text-muted-foreground">{statsResult.error.message}</p>
        </Panel>
      )}

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
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Personality</span>
              <p className="text-sm text-foreground">{agentResult.data.personality}</p>
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
        title="Consultation script"
        description="The structured questions the Receptionist AI walks every visitor through."
      >
        {questions.length > 0 ? (
          <ol className="flex flex-col gap-5">
            {questions.map((question, index) => (
              <li key={question.id} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">
                  {index + 1}. {question.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <span
                      key={option.value}
                      className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-foreground"
                    >
                      {option.label}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No consultation questions configured.</p>
        )}
      </Panel>

      <Panel title="Routing & escalation" description="How the Receptionist AI decides where each visitor goes next.">
        <div className="flex flex-col gap-3 text-sm text-foreground">
          <p>
            After the consultation, the Receptionist AI recommends the best-fit specialist and attaches a{' '}
            <strong>confidence score</strong> to that recommendation.
          </p>
          <p>
            When confidence falls below{' '}
            <strong>{Math.round(CONFIDENCE_THRESHOLD * 100)}%</strong> (a configurable, prototype-mock
            threshold), the visitor is escalated to the client (or an authorised team member) instead
            of being auto-routed — so uncertain cases always reach a person.
          </p>
        </div>
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
        Prototype — mock data through the service layer. No live AI, payments or patient data.
      </p>
    </div>
  )
}
