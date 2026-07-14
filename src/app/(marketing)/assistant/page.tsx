import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { receptionist } from '@/services/receptionist';
import { ReceptionistConsole } from '@/components/sections/receptionist-console';

export const metadata: Metadata = createMetadata({
  title: 'Ask Makela',
  description: 'Speak with Makela, your wellbeing concierge. Tell her what you need and she will guide you to the right specialist.',
  path: '/assistant',
});

export default async function AssistantPage() {
  const settingsResult = await receptionist.settings();
  const settings = settingsResult.ok ? settingsResult.data : null;

  return (
    <>
      <PageHero
        eyebrow="Your wellbeing concierge"
        title="Ask Makela"
        lede="Tell Makela what you need help with. She listens first, then guides you to the specialist best placed to help — or connects you with a member of the team."
      />
      <Section tone="default" spacing="lg" containerSize="narrow">
        {settings ? (
          <ReceptionistConsole
            settings={{
              active: settings.active,
              greeting: settings.greeting,
              questions: settings.questions,
              whatsappEnabled: settings.whatsappEnabled,
              whatsappNumber: settings.whatsappNumber,
            }}
          />
        ) : (
          <p className="text-muted-foreground">
            Makela is currently unavailable. Please use the contact page.
          </p>
        )}
      </Section>
    </>
  );
}
