import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { CalendarDays, Check, Stethoscope, User } from 'lucide-react';
import Link from 'next/link';

export const metadata = createMetadata({ title: 'Consultation case' });

// prototype mock — keyed by case id so the detail matches the row that was clicked.
type CaseRecord = {
  member: string;
  practitioner: string;
  stage: string;
  status: string;
  reason: string;
  started: string;
  timeline: { stage: string; title: string; at: string; actor: string }[];
  notes: { author: string; at: string; text: string }[];
};

const CASES: Record<string, CaseRecord> = {
  case_1: {
    member: 'Customer A', practitioner: 'Practitioner One', stage: 'assessment', status: 'in_progress',
    reason: 'General enquiry', started: '2026-07-06',
    timeline: [
      { stage: 'intake', title: 'Intake completed', at: '6 Jul, 09:12', actor: 'Customer A' },
      { stage: 'assessment', title: 'Assessment scored', at: '6 Jul, 09:40', actor: 'System' },
      { stage: 'ai_review', title: 'AI review drafted', at: '6 Jul, 09:41', actor: 'Makela' },
    ],
    notes: [{ author: 'Practitioner One', at: '7 Jul', text: 'Reviewed intake; recommend starting with the first two pillars.' }],
  },
  case_2: {
    member: 'Customer B', practitioner: 'Unassigned', stage: 'intake', status: 'awaiting_review',
    reason: 'Flagged for review at intake', started: '2026-07-10',
    timeline: [
      { stage: 'intake', title: 'Intake completed', at: '10 Jul, 08:30', actor: 'Customer B' },
      { stage: 'ai_review', title: 'Flagged for human review', at: '10 Jul, 08:31', actor: 'Makela' },
    ],
    notes: [],
  },
  case_3: {
    member: 'Customer C', practitioner: 'Practitioner One', stage: 'practitioner_review', status: 'in_progress',
    reason: 'Follow-up on care plan', started: '2026-07-08',
    timeline: [
      { stage: 'intake', title: 'Intake completed', at: '8 Jul, 11:00', actor: 'Customer C' },
      { stage: 'assessment', title: 'Assessment scored', at: '8 Jul, 11:20', actor: 'System' },
      { stage: 'practitioner_review', title: 'Awaiting practitioner sign-off', at: '8 Jul, 12:00', actor: 'Practitioner One' },
    ],
    notes: [{ author: 'Practitioner One', at: '8 Jul', text: 'Care plan progressing well; review hydration targets next session.' }],
  },
  case_4: {
    member: 'Customer D', practitioner: 'Staff One', stage: 'follow_up', status: 'completed',
    reason: 'Completed programme', started: '2026-07-05',
    timeline: [
      { stage: 'intake', title: 'Intake completed', at: '5 Jul, 09:00', actor: 'Customer D' },
      { stage: 'follow_up', title: 'Programme completed', at: '5 Jul, 16:00', actor: 'Staff One' },
    ],
    notes: [{ author: 'Staff One', at: '5 Jul', text: 'Programme completed; member opted into a monthly check-in.' }],
  },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const CASE = CASES[id] ?? CASES.case_1!;
  const TIMELINE = CASE.timeline;
  const NOTES = CASE.notes;

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
        Prototype — mock data, served through the service layer. AI replies run on the live model (non-production); no real patient data.
      </p>
    </div>
  );
}
