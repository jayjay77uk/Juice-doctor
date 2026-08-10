'use client';

import * as React from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Panel } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { saveNotificationPrefsAction } from '@/services/member-actions';
import type { NotificationPrefs } from '@/services/notification-prefs';

const TOGGLES: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: 'emailCheckins', label: 'Email check-ins', hint: 'Your preference for a short weekly progress note — email delivery is coming soon.' },
  { key: 'dailyNudges', label: 'Daily nudges', hint: 'Your preference for gentle reminders — delivery is coming soon.' },
  { key: 'sharePractitioner', label: 'Share with practitioner', hint: 'Let your practitioner see your progress ahead of sessions.' },
];

/** Real notification preferences — saved to the member's own preferences record. */
export function NotificationPrefsCard({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await saveNotificationPrefsAction(prefs);
    setBusy(false);
    if (res.ok) setSaved(true);
  }

  const dirty = JSON.stringify(prefs) !== JSON.stringify(initial);

  return (
    <Panel title="Notifications" description="Choose how you'd like us to stay in touch.">
      <div className="flex flex-col gap-1">
        {TOGGLES.map((t) => (
          <label
            key={t.key}
            className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-surface-muted"
          >
            <span className="flex items-start gap-3">
              <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{t.label}</span>
                <span className="text-sm text-muted-foreground">{t.hint}</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={prefs[t.key]}
              onChange={() => toggle(t.key)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy || !dirty}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          {saved ? 'Saved' : 'Save preferences'}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Your preferences are saved.</span>}
      </div>
    </Panel>
  );
}
