'use client';

import * as React from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Panel } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { saveNotificationPrefsAction } from '@/services/member-actions';
import type { NotificationPrefs } from '@/services/notification-prefs';

const TOGGLES: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  {
    key: 'emailCheckins',
    label: 'Email check-ins',
    hint: 'A weekly reminder when email delivery is enabled.',
  },
  {
    key: 'dailyNudges',
    label: 'Daily nudges',
    hint: 'Gentle daily reminders in your dashboard when follow-ups are enabled.',
  },
  {
    key: 'inAppFollowups',
    label: 'Weekly dashboard check-ins',
    hint: 'A weekly prompt to reflect on your goals. Manage practitioner sharing in the separate consent controls.',
  },
];

/** Real notification preferences — saved to the member's own preferences record. */
export function NotificationPrefsCard({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState(false);

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(false);
    try {
      const res = await saveNotificationPrefsAction(prefs);
      if (res.ok) setSaved(true);
      else setError(true);
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  const dirty = JSON.stringify(prefs) !== JSON.stringify(initial);

  return (
    <Panel title="Notifications" description="Choose how you'd like us to stay in touch.">
      <div className="flex flex-col gap-1">
        {TOGGLES.map((t) => (
          <label
            key={t.key}
            className="hover:bg-surface-muted flex cursor-pointer items-start justify-between gap-4 rounded-xl px-3 py-3 transition-colors"
          >
            <span className="flex items-start gap-3">
              <Bell className="text-primary mt-0.5 size-4 shrink-0" />
              <span className="flex flex-col gap-0.5">
                <span className="text-foreground text-sm font-medium">{t.label}</span>
                <span className="text-muted-foreground text-sm">{t.hint}</span>
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
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saved ? 'Saved' : 'Save preferences'}
        </Button>
        {saved && (
          <span className="text-muted-foreground text-sm">Your preferences are saved.</span>
        )}
        {error && <span role="alert">Preferences could not be saved. Please retry.</span>}
      </div>
    </Panel>
  );
}
