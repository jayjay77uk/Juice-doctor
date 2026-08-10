import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, ShieldAlert, Activity } from 'lucide-react';

import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { LeadReviewActions } from '@/components/admin/lead-review-actions';
import { crm } from '@/services/crm';
import { specialists } from '@/services/specialists';

export const metadata = createMetadata({ title: 'CRM lead' });

/** "mainConcern" → "Main concern", "firstName" → "First name". */
function humaniseKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default async function CrmLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const leadResult = await crm.byId(id);
  if (!leadResult.ok) notFound();
  const lead = leadResult.data;

  const [eventsResult, specialistsResult] = await Promise.all([
    crm.events(lead.id),
    specialists.all(),
  ]);
  const events = eventsResult.ok ? eventsResult.data : [];
  const specialistOptions = (specialistsResult.ok ? specialistsResult.data : []).map((s) => ({
    slug: s.slug,
    name: s.name,
  }));

  const confidencePct = Math.round(lead.recommendationConfidence * 100);
  const assessmentEntries = Object.entries(lead.assessment);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title={lead.name}
        breadcrumbs={[{ label: 'CRM', href: '/admin/crm' }, { label: lead.name }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={lead.status} />
            <StatusBadge status={lead.followUpStatus} />
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT */}
        <div className="flex flex-col gap-8">
          <Panel title="Receptionist assessment">
            <p className="text-sm leading-relaxed text-foreground">
              {lead.assessmentSummary}
            </p>
            {assessmentEntries.length > 0 && (
              <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {assessmentEntries.map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {humaniseKey(key)}
                    </dt>
                    <dd className="text-sm text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          <Panel title="Conversation" padded={false}>
            {lead.conversation.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">
                No conversation recorded for this lead.
              </p>
            ) : (
              <div className="flex flex-col gap-3 px-5 py-6 sm:px-6">
                {lead.conversation.map((turn, index) => (
                  <div key={index} className={turn.role === 'visitor' ? 'flex justify-end' : 'flex justify-start'}>
                    <p
                      className={
                        turn.role === 'visitor'
                          ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground'
                          : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-muted px-4 py-2.5 text-sm text-foreground'
                      }
                    >
                      {turn.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Activity timeline" padded={false}>
            {events.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">
                No activity recorded yet.
              </p>
            ) : (
              <ol className="relative flex flex-col gap-6 px-5 py-6 sm:px-6">
                {events.map((event, index) => (
                  <li key={event.id} className="relative flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />
                      {index < events.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-sm font-medium text-foreground">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.actor} · {event.createdAt.slice(0, 10)}
                      </p>
                      {event.detail && (
                        <p className="mt-1.5 text-sm text-foreground">
                          {event.detail}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-8">
          <Panel title="AI recommendation">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recommended specialist
                </span>
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <Sparkles className="h-4 w-4 text-secondary" aria-hidden />
                  {lead.recommendedSpecialistName ?? '— (escalated)'}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Confidence
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {confidencePct}%
                  </span>
                </div>
                <span className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-secondary"
                    style={{ width: `${confidencePct}%` }}
                  />
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Assigned specialist
                </span>
                <span className="text-sm text-foreground">
                  {lead.assignedSpecialistSlug ?? 'Not yet assigned'}
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Follow-up & progress">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Follow-up
                </span>
                <span>
                  <StatusBadge status={lead.followUpStatus} />
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Progress
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {lead.progress}%
                  </span>
                </div>
                <span className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-secondary"
                    style={{ width: `${lead.progress}%` }}
                  />
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Escalation">
            {lead.escalated ? (
              <div className="flex gap-3">
                <ShieldAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    Escalated to {lead.escalatedTo ?? 'the escalation target'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The client (or an authorised team member) will review this lead and follow up directly.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 shrink-0" aria-hidden />
                No escalation — handled by AI.
              </div>
            )}
          </Panel>

          <Panel title="Contact">
            <dl className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </dt>
                <dd className="text-sm text-foreground">
                  <Link
                    href={`mailto:${lead.email}`}
                    className="underline underline-offset-4 hover:text-secondary"
                  >
                    {lead.email}
                  </Link>
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  WhatsApp
                </dt>
                <dd className="text-sm text-foreground">{lead.whatsapp ?? '—'}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>

      <Panel
        title="Human review & takeover"
        description="Approve or change the recommendation, reply to the visitor, add notes, assign the lead, and manage follow-up."
      >
        <div className="mb-6 grid gap-x-6 gap-y-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Review status</span>
            <span className="text-sm text-foreground">
              {lead.reviewClosed ? 'Closed' : lead.humanReviewStatus === 'pending' ? 'Pending review' : lead.humanReviewStatus}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Responsible</span>
            <span className="text-sm text-foreground">{lead.responsibleAdmin ?? 'Unassigned'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">WhatsApp</span>
            <span className="text-sm text-foreground">{lead.whatsappStatus}</span>
          </div>
        </div>

        {lead.notes && (
          <div className="mb-6 flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</span>
            <p className="whitespace-pre-wrap text-sm text-foreground">{lead.notes}</p>
          </div>
        )}

        <LeadReviewActions
          lead={{
            id: lead.id,
            recommendedSpecialistSlug: lead.recommendedSpecialistSlug,
            assignedSpecialistSlug: lead.assignedSpecialistSlug,
            reviewClosed: lead.reviewClosed,
            followUpStatus: lead.followUpStatus,
            whatsappStatus: lead.whatsappStatus,
            responsibleAdmin: lead.responsibleAdmin,
            status: lead.status,
            reminderAt: lead.reminderAt,
          }}
          specialists={specialistOptions}
        />
      </Panel>

      <p className="text-sm text-muted-foreground">
        Live data from the platform database — includes seeded demonstration leads. AI replies run on the live model and are not clinically reviewed. No payment provider is connected.
      </p>
    </div>
  );
}
