import { notFound } from 'next/navigation';
import { Check, Stethoscope, User, CalendarDays } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { requireRole } from '@/lib/auth/authorize';
import { consultationsRepo } from '@/services/repositories/consultations-repo';
import { addConsultationNoteAction, reviewConsultationAction } from '@/services/consultation-admin-actions';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';

export const metadata = createMetadata({ title: 'Practitioner case' });
export const dynamic = 'force-dynamic';

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default async function PractitionerCasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('practitioner', '/practitioner');
  const { id } = await params;
  const result = await consultationsRepo.byId(id);
  if (!result || result.consultation.practitionerId !== session.user.id) notFound();
  const { consultation: CASE, events } = result;
  const reviewable = ['awaiting_review', 'in_progress', 'scheduled'].includes(CASE.status);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <AdminHeader
          title={`Case · ${CASE.memberName}`}
          description={`${CASE.reason}${CASE.startedAt ? ` · started ${fmt(CASE.startedAt)}` : ''}`}
          breadcrumbs={[{ label: 'Practitioner', href: '/practitioner' }, { label: CASE.memberName }]}
          actions={
            <div className="flex gap-2">
              <StatusBadge status={CASE.stage} />
              <StatusBadge status={CASE.status} />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-8">
            <Panel title="Case history" description="Append-only record for this assigned case.">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No case events have been recorded yet.</p>
              ) : (
                <ol className="relative flex flex-col gap-6 border-l border-border pl-6">
                  {events.map((item) => (
                    <li key={item.id} className="relative">
                      <span className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-surface bg-primary" aria-hidden />
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.detail && <p className="mt-1 text-sm text-foreground">{item.detail}</p>}
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.actorName} · {fmt(item.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel title="Practitioner note" description="Notes append to the case history and cannot rewrite prior events.">
              <form action={addConsultationNoteAction} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={CASE.id} />
                <textarea
                  name="text"
                  rows={4}
                  required
                  minLength={2}
                  maxLength={1000}
                  placeholder="Add a clinical/operational review note."
                  className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]"
                />
                <div><Button type="submit" size="sm">Add note</Button></div>
              </form>
            </Panel>
          </div>

          <div className="flex flex-col gap-8">
            <Panel title="Human review">
              {CASE.aiReview ? <p className="text-sm text-foreground">{CASE.aiReview}</p> : <p className="text-sm text-muted-foreground">No AI review has been drafted for this case.</p>}
              {reviewable ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <form action={reviewConsultationAction}>
                    <input type="hidden" name="id" value={CASE.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <Button type="submit" size="sm"><Check className="size-4" /> Approve</Button>
                  </form>
                  <form action={reviewConsultationAction}>
                    <input type="hidden" name="id" value={CASE.id} />
                    <input type="hidden" name="decision" value="request_changes" />
                    <Button type="submit" size="sm" intent="outline">Request changes</Button>
                  </form>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">This case is {CASE.status.replaceAll('_', ' ')}.</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Both decisions are recorded in the immutable timeline and audit log.</p>
            </Panel>

            <Panel title="Case details">
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground"><User className="size-4" /> Member</dt>
                  <dd className="font-medium text-foreground">{CASE.memberName}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground"><Stethoscope className="size-4" /> Practitioner</dt>
                  <dd className="font-medium text-foreground">{CASE.practitionerName}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4" /> Started</dt>
                  <dd className="text-foreground">{CASE.startedAt ? fmt(CASE.startedAt) : '—'}</dd>
                </div>
              </dl>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
