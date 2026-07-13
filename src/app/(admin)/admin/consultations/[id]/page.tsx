import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { CalendarDays, Check, Stethoscope, User } from 'lucide-react';
import Link from 'next/link';

export const metadata = createMetadata({ title: 'Consultation case' });

// prototype mock
const CASE = {
  member: 'Customer A',
  practitioner: 'Practitioner One',
  stage: 'practitioner_review',
  status: 'in_progress',
  reason: 'General enquiry',
  started: '2026-07-06',
};

// prototype mock
const TIMELINE = [
  { stage: 'intake', title: 'Intake completed', at: '6 Jul, 09:12', actor: 'Customer A' },
  { stage: 'assessment', title: 'Assessment scored', at: '6 Jul, 09:40', actor: 'System' },
  { stage: 'ai_review', title: 'AI review drafted', at: '6 Jul, 09:41', actor: 'Makela' },
  {
    stage: 'practitioner_review',
    title: 'Awaiting practitioner sign-off',
    at: '7 Jul, 10:00',
    actor: 'Practitioner One',
  },
];

// prototype mock
const NOTES = [
  {
    author: 'Practitioner One',
    at: '7 Jul',
    text: 'Reviewed intake; recommend starting with the first two pillars.',
  },
];

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title={`Case · ${CASE.member}`}
        description={`Case ${id} · ${CASE.reason}`}
        breadcrumbs={[
          { label: 'Consultations', href: '/admin/consultations' },
          { label: CASE.member },
        ]}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={CASE.stage} />
            <StatusBadge status={CASE.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-8">
          <Panel title="History timeline" description="Append-only record of every step in this case.">
            <ol className="relative flex flex-col gap-6 border-l border-border pl-6">
              {TIMELINE.map((item, i) => (
                <li key={i} className="relative">
                  <span
                    className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-surface bg-primary"
                    aria-hidden
                  />
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.actor} · {item.at}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Case notes" description="Notes are append-only and preserved for the audit trail.">
            <ul className="flex flex-col gap-4">
              {NOTES.map((note, i) => (
                <li key={i} className="rounded-xl border border-border bg-surface-muted p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground">{note.author}</span>
                    <span className="text-xs text-muted-foreground">{note.at}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{note.text}</p>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-col gap-2">
              <textarea
                disabled
                rows={3}
                placeholder="Add a note — notes are append-only and cannot be edited once saved."
                className="w-full cursor-not-allowed resize-none rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Prototype — the note composer is illustrative. In production, saving appends a new,
                immutable entry to the timeline.
              </p>
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-8">
          <Panel title="Assessment review">
            <p className="text-sm text-foreground">
              {CASE.member} submitted a {CASE.reason.toLowerCase()}. The Assessment and AI draft
              are ready for practitioner sign-off.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Assessment score</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700">
                <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                62 / 100
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className={buttonVariants({ intent: 'primary', size: 'sm' })}>
                <Check className="size-4" aria-hidden />
                Approve
              </span>
              <span className={buttonVariants({ intent: 'outline', size: 'sm' })}>
                Request changes
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Prototype — these actions are illustrative and would be wired to sign-off workflows in
              production.
            </p>
          </Panel>

          <Panel title="Practitioner assignment">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                <Stethoscope className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-foreground">{CASE.practitioner}</p>
                <p className="text-sm text-muted-foreground">Assigned practitioner</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Reassignment is restricted to clinic leads and is fully audited.
            </p>
          </Panel>

          <Panel title="Follow-up">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-foreground">14 Jul 2026</p>
                <p className="text-sm text-muted-foreground">Next scheduled follow-up</p>
              </div>
            </div>
          </Panel>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="size-4" aria-hidden />
            <span>Member since {CASE.started}</span>
          </div>

          <Button asChild size="sm" intent="ghost">
            <Link href="/admin/consultations">Back to consultations</Link>
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Prototype — mock data, served through the service layer. No production AI or patient data.
      </p>
    </div>
  );
}
