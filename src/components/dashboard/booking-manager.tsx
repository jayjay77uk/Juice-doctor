'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, CalendarPlus, Loader2, Video, Phone, MapPin, X, Clock } from 'lucide-react';
import { Panel } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/admin/empty-state';
import { StatusBadge } from '@/components/admin/status-badge';
import {
  bookAppointmentAction,
  cancelAppointmentAction,
  rescheduleAppointmentAction,
} from '@/services/booking-actions';
import type { MemberAppointment } from '@/services/repositories/member-repo';

const controlClass =
  'w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]';

const LOCATION_META: Record<string, { label: string; icon: typeof Video }> = {
  video: { label: 'Video call', icon: Video },
  phone: { label: 'Phone call', icon: Phone },
  in_person: { label: 'In person', icon: MapPin },
};

function fmt(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** The soonest bookable slot for the datetime-local input (now + ~2h, on the hour). */
function minSlotValue(): string {
  const d = new Date(Date.now() + 2 * 60 * 60_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AppointmentRow({ appt, serviceTitle }: { appt: MemberAppointment; serviceTitle: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<'cancel' | 'move' | null>(null);
  const [moving, setMoving] = React.useState(false);
  const [newTime, setNewTime] = React.useState(minSlotValue());
  const [error, setError] = React.useState<string | null>(null);
  const loc = LOCATION_META[appt.locationType] ?? LOCATION_META.video!;
  const LocIcon = loc.icon;

  async function cancel() {
    setBusy('cancel');
    setError(null);
    const res = await cancelAppointmentAction(appt.id);
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Could not cancel.');
    else router.refresh();
  }

  async function move() {
    setBusy('move');
    setError(null);
    const res = await rescheduleAppointmentAction(appt.id, new Date(newTime).toISOString());
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Could not move the appointment.');
    else {
      setMoving(false);
      router.refresh();
    }
  }

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-100 text-primary">
          <CalendarDays className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{serviceTitle}</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-3.5" /> {fmt(appt.scheduledStart)}
            <span className="inline-flex items-center gap-1"><LocIcon className="size-3.5" /> {loc.label}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={appt.status} />
          <Button size="sm" intent="ghost" onClick={() => setMoving((m) => !m)} disabled={busy !== null}>
            Reschedule
          </Button>
          <Button size="sm" intent="ghost" className="text-danger" onClick={cancel} disabled={busy !== null}>
            {busy === 'cancel' ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Cancel
          </Button>
        </div>
      </div>
      {moving && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted px-4 py-3">
          <input
            type="datetime-local"
            value={newTime}
            min={minSlotValue()}
            onChange={(e) => setNewTime(e.target.value)}
            className={`${controlClass} max-w-60`}
            aria-label="New date and time"
          />
          <Button size="sm" onClick={move} disabled={busy !== null}>
            {busy === 'move' ? <Loader2 className="size-4 animate-spin" /> : null} Confirm new time
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </li>
  );
}

/**
 * Real member booking: create an appointment (requested until the team confirms),
 * see upcoming ones, cancel or reschedule. All actions touch only the signed-in
 * member's own records.
 */
export function BookingManager({
  upcoming,
  past,
  services,
}: {
  upcoming: MemberAppointment[];
  past: MemberAppointment[];
  services: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const [service, setService] = React.useState(services[0]?.slug ?? '');
  const [location, setLocation] = React.useState('video');
  const [time, setTime] = React.useState(minSlotValue());
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const titleFor = (slug: string) => services.find((x) => x.slug === slug)?.title ?? 'Consultation';

  async function book() {
    setBusy(true);
    setMessage(null);
    const res = await bookAppointmentAction({
      serviceSlug: service,
      locationType: location,
      startIso: new Date(time).toISOString(),
      notes,
    });
    setBusy(false);
    if (res.ok) {
      setMessage({ kind: 'ok', text: 'Booked — your appointment is requested and the team will confirm it.' });
      setNotes('');
      router.refresh();
    } else {
      setMessage({ kind: 'error', text: res.error ?? 'Could not book. Please try again.' });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Panel title="Book a session" description="Choose a service and a time — the team confirms every request.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Service
            <select value={service} onChange={(e) => setService(e.target.value)} className={controlClass}>
              {services.map((sv) => (
                <option key={sv.slug} value={sv.slug}>{sv.title}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            How you’d like to meet
            <select value={location} onChange={(e) => setLocation(e.target.value)} className={controlClass}>
              <option value="video">Video call</option>
              <option value="phone">Phone call</option>
              <option value="in_person">In person</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Date &amp; time
            <input type="datetime-local" value={time} min={minSlotValue()} onChange={(e) => setTime(e.target.value)} className={controlClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Anything we should know? <span className="font-normal text-muted-foreground">(optional)</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="e.g. what you'd like to focus on" className={controlClass} />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={book} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />} Book session
          </Button>
          {message && (
            <p className={message.kind === 'ok' ? 'text-sm text-secondary' : 'text-sm text-danger'} role={message.kind === 'error' ? 'alert' : 'status'}>
              {message.text}
            </p>
          )}
        </div>
      </Panel>

      <Panel title="Upcoming sessions" description="Your next few appointments, all in one place." padded={false}>
        {upcoming.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              icon={CalendarPlus}
              title="Nothing on the calendar yet"
              description="Book a session above and it will show up right here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((a) => (
              <AppointmentRow key={a.id} appt={a} serviceTitle={titleFor(a.serviceSlug)} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Past & cancelled" description="A look back at earlier sessions." padded={false}>
        {past.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">No past sessions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {past.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground">
                  <CalendarDays className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{titleFor(a.serviceSlug)}</p>
                  <p className="text-sm text-muted-foreground">{fmt(a.scheduledStart)}</p>
                </div>
                <Badge tone={a.status === 'completed' ? 'secondary' : 'outline'}>{a.status.replaceAll('_', ' ')}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
