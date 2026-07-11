'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  approveRecommendationAction,
  changeRecommendationAction,
  addNoteAction,
  assignLeadAction,
  setFollowUpAction,
  setWhatsappAction,
  takeOverAction,
  closeReviewAction,
  reopenReviewAction,
  setLeadStatusAction,
  setReminderAction,
} from '@/services/crm-actions';
import { Button } from '@/components/ui/button';
import {
  LEAD_STATUS_ORDER,
  LEAD_STATUS_LABELS,
  type LeadFollowUp,
  type LeadWhatsapp,
  type LeadStatus,
} from '@/types/crm';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

type Res = { ok: true } | { ok: false; error: string };

function ActionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

export interface LeadReviewState {
  id: string;
  recommendedSpecialistSlug: string | null;
  assignedSpecialistSlug: string | null;
  reviewClosed: boolean;
  followUpStatus: LeadFollowUp;
  whatsappStatus: LeadWhatsapp;
  responsibleAdmin: string | null;
  status: LeadStatus;
  reminderAt: string | null;
}

export function LeadReviewActions({
  lead,
  specialists,
}: {
  lead: LeadReviewState;
  specialists: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');
  const [assignee, setAssignee] = React.useState(lead.responsibleAdmin ?? '');
  const [takeover, setTakeover] = React.useState('');
  const [changeSlug, setChangeSlug] = React.useState(
    lead.assignedSpecialistSlug ?? lead.recommendedSpecialistSlug ?? specialists[0]?.slug ?? '',
  );
  const [followUp, setFollowUp] = React.useState<LeadFollowUp>(lead.followUpStatus);
  const [whatsapp, setWhatsapp] = React.useState<LeadWhatsapp>(lead.whatsappStatus);
  const [status, setStatus] = React.useState<LeadStatus>(lead.status);
  const [reminder, setReminder] = React.useState(lead.reminderAt ? lead.reminderAt.slice(0, 10) : '');

  function run(fn: () => Promise<Res>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <ActionSection title="Recommendation">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => approveRecommendationAction(lead.id))}>
            Approve recommendation
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={changeSlug} onChange={(e) => setChangeSlug(e.target.value)} className={`${inputClass} max-w-xs`}>
            {specialists.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            intent="ghost"
            disabled={pending || !changeSlug}
            onClick={() => run(() => changeRecommendationAction(lead.id, changeSlug))}
          >
            Change recommendation
          </Button>
        </div>
      </ActionSection>

      <ActionSection title="Reply / take over the conversation">
        <textarea
          value={takeover}
          onChange={(e) => setTakeover(e.target.value)}
          rows={2}
          placeholder="Type a message to the visitor…"
          className={inputClass}
        />
        <div>
          <Button
            size="sm"
            disabled={pending || !takeover.trim()}
            onClick={() =>
              run(async () => {
                const res = await takeOverAction(lead.id, takeover);
                if (res.ok) setTakeover('');
                return res;
              })
            }
          >
            Send reply
          </Button>
        </div>
      </ActionSection>

      <ActionSection title="Notes">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a note…"
          className={inputClass}
        />
        <div>
          <Button
            size="sm"
            intent="ghost"
            disabled={pending || !note.trim()}
            onClick={() =>
              run(async () => {
                const res = await addNoteAction(lead.id, note);
                if (res.ok) setNote('');
                return res;
              })
            }
          >
            Add note
          </Button>
        </div>
      </ActionSection>

      <ActionSection title="Assign to a team member">
        <div className="flex flex-wrap items-center gap-2">
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Team member" className={`${inputClass} max-w-xs`} />
          <Button size="sm" intent="ghost" disabled={pending || !assignee.trim()} onClick={() => run(() => assignLeadAction(lead.id, assignee))}>
            Assign
          </Button>
        </div>
      </ActionSection>

      <div className="grid gap-4 sm:grid-cols-2">
        <ActionSection title="Follow-up">
          <div className="flex items-center gap-2">
            <select value={followUp} onChange={(e) => setFollowUp(e.target.value as LeadFollowUp)} className={inputClass}>
              <option value="none">None</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <Button size="sm" intent="ghost" disabled={pending} onClick={() => run(() => setFollowUpAction(lead.id, followUp))}>
              Set
            </Button>
          </div>
        </ActionSection>

        <ActionSection title="WhatsApp follow-up">
          <div className="flex items-center gap-2">
            <select value={whatsapp} onChange={(e) => setWhatsapp(e.target.value as LeadWhatsapp)} className={inputClass}>
              <option value="none">None</option>
              <option value="requested">Requested</option>
              <option value="sent">Sent</option>
              <option value="connected">Connected</option>
            </select>
            <Button size="sm" intent="ghost" disabled={pending} onClick={() => run(() => setWhatsappAction(lead.id, whatsapp))}>
              Set
            </Button>
          </div>
        </ActionSection>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ActionSection title="Pipeline status">
          <div className="flex items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className={inputClass}>
              {LEAD_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <Button size="sm" intent="ghost" disabled={pending} onClick={() => run(() => setLeadStatusAction(lead.id, status))}>
              Set status
            </Button>
          </div>
        </ActionSection>

        <ActionSection title="Reminder">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className={`${inputClass} max-w-[10rem]`}
            />
            <Button
              size="sm"
              intent="ghost"
              disabled={pending || !reminder}
              onClick={() => run(() => setReminderAction(lead.id, reminder ? new Date(reminder).toISOString() : null))}
            >
              Set reminder
            </Button>
            <Button
              size="sm"
              intent="ghost"
              disabled={pending || (!reminder && !lead.reminderAt)}
              onClick={() =>
                run(async () => {
                  const res = await setReminderAction(lead.id, null);
                  if (res.ok) setReminder('');
                  return res;
                })
              }
            >
              Clear
            </Button>
          </div>
        </ActionSection>
      </div>

      <ActionSection title="Review">
        {lead.reviewClosed ? (
          <div>
            <Button size="sm" intent="ghost" disabled={pending} onClick={() => run(() => reopenReviewAction(lead.id))}>
              Reopen review
            </Button>
          </div>
        ) : (
          <div>
            <Button size="sm" disabled={pending} onClick={() => run(() => closeReviewAction(lead.id))}>
              Close review
            </Button>
          </div>
        )}
      </ActionSection>
    </div>
  );
}
