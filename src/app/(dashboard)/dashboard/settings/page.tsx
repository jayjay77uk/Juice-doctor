import Link from 'next/link';
import { User, Shield, Settings } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { LanguageVoiceCard } from '@/components/settings/language-voice-card';
import { getLanguagePreference } from '@/services/herne/language-store';
import { MemoryCard } from '@/components/settings/memory-card';
import { NotificationPrefsCard } from '@/components/settings/notification-prefs-card';
import { DisplayNameForm } from '@/components/dashboard/profile-forms';
import { getNotificationPrefs } from '@/services/notification-prefs';
import { getMemoryEnabled } from '@/services/memory-prefs';
import { memoryRepo } from '@/services/repositories/memory-repo';
import { getSession } from '@/services/auth';

export const metadata = createMetadata({ title: 'Settings' });
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getSession();
  const [languagePreference, memoryEnabled, memories, notificationPrefs] = await Promise.all([
    getLanguagePreference(),
    getMemoryEnabled(),
    session?.user.id ? memoryRepo.listForUser(session.user.id) : Promise.resolve([]),
    getNotificationPrefs(),
  ]);
  const profileRows: { label: string; value: string }[] = [
    { label: 'Name', value: session?.user.name || session?.user.email?.split('@')[0] || 'Member' },
    { label: 'Email', value: session?.user.email ?? '—' },
  ];
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Settings"
        description="Manage your account and preferences."
      />

      <Panel
        title="Profile"
        description="The basics we use to personalise your experience."
        actions={<DisplayNameForm current={session?.user.name ?? ''} />}
      >
        <dl className="divide-y divide-border">
          {profileRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="size-4 text-primary" />
                {row.label}
              </dt>
              <dd className="text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <LanguageVoiceCard initial={languagePreference} />

      <MemoryCard enabled={memoryEnabled} memories={memories} />

      <NotificationPrefsCard initial={notificationPrefs} />

      <Panel
        title="Privacy & data"
        description="You're always in control of your information."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild intent="outline">
              <a href="/api/account/export" download="juice-doctor-data.json">
              <Shield className="size-4" />
              Download my data
              </a>
            </Button>
            <Button asChild intent="ghost">
              <Link href="/privacy">Privacy policy</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Your export is generated on demand and scoped to your account. Contact the team to correct,
            delete or withdraw consent for information that cannot be changed here.
          </p>
        </div>
      </Panel>

      <Panel
        title="Danger zone"
        description="Take a break or step away — your progress stays safe."
        className="border-danger/40"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Deactivating pauses your membership and hides your profile. Contact the team to request account
            deletion or consent withdrawal so the request can be reviewed safely.
          </p>
          <div>
            <Button asChild intent="outline" className="border-danger/50 text-danger">
              <a href="mailto:support@juicedoctor.example?subject=Account%20deactivation">
              <Settings className="size-4" />
              Request account deactivation
              </a>
            </Button>
          </div>
        </div>
      </Panel>

      <p className="text-sm text-muted-foreground">
        Your profile, language, memory, notification and subscription settings are live. Data export is
        available above; deletion and consent withdrawal requests are reviewed by the support team.
      </p>
    </div>
  );
}
