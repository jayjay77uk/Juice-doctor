import { Route, MapPin } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { member } from '@/services/member';
import { assertSession } from '@/lib/auth/authorize';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { JourneySelection } from '@/components/dashboard/journal-form';

export const metadata = createMetadata({ title: 'Your journey' });

const TYPE_TONE: Record<string, 'green' | 'amber' | 'teal' | 'neutral'> = {
  milestone: 'green',
  assessment: 'teal',
  session: 'amber',
  programme: 'neutral',
};

const TYPE_LABEL: Record<string, string> = {
  milestone: 'Milestone',
  assessment: 'Assessment',
  session: 'Session',
  programme: 'Programme',
};

export default async function JourneyPage() {
  const { user } = await assertSession();
  const sb = await createSupabaseServerClient();
  const selection = sb ? await sb.from('member_journeys').select('focus').eq('user_id', user.id).maybeSingle() : null;
  const journeyResult = await member.journey();
  const events = journeyResult.ok ? journeyResult.data : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Your journey"
        description="Every milestone since you started."
      />
      <Panel title="Choose your focus" description="A wellbeing priority you can change as your needs change. Specialists can use this focus in future chats when you allow AI processing.">
        {selection && !selection.error ? <JourneySelection focus={selection.data?.focus ?? ''} /> : <p role="alert">Journey selection is temporarily unavailable.</p>}
      </Panel>

      <Panel
        title="Your progress story"
        description="A warm look back at how far you've come."
        actions={
          <span className="grid size-9 place-items-center rounded-full bg-teal-100 text-primary">
            <Route className="size-4.5" />
          </span>
        }
      >
        {events.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Your journey starts here"
            description="As you complete assessments, sessions and milestones, they'll appear along this timeline."
          />
        ) : (
          <ol className="flex flex-col gap-6">
            {events.map((event, i) => {
              const isLast = i === events.length - 1;
              const tone = TYPE_TONE[event.type] ?? 'neutral';
              const label = TYPE_LABEL[event.type] ?? event.type;
              return (
                <li key={`${event.date}-${i}`} className="flex gap-4">
                  {/* Left column: dot on a connecting line */}
                  <div className="flex flex-col items-center">
                    <span className="mt-1 grid size-3 shrink-0 place-items-center rounded-full bg-secondary ring-4 ring-teal-100" />
                    {!isLast && (
                      <span className="mt-1 w-px flex-1 rounded-full bg-border" aria-hidden />
                    )}
                  </div>

                  {/* Right column: details */}
                  <div className={isLast ? 'pb-0' : 'pb-2'}>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-foreground">{event.title}</h3>
                      <StatusBadge status={label} tone={tone} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">
        This timeline is built from your own account activity. AI replies are AI-generated and not clinically reviewed — not for emergencies.
      </p>
    </div>
  );
}
