import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { receptionist } from '@/services/receptionist';
import { ReceptionistConsole } from '@/components/sections/receptionist-console';

export const metadata: Metadata = createMetadata({
  title: 'AI receptionist',
  description: 'Speak with the AI receptionist. Tell us what you need help with and we will point you to the right place.',
  path: '/assistant',
});

export default async function AssistantPage() {
  const settingsResult = await receptionist.settings();
  const settings = settingsResult.ok ? settingsResult.data : null;

  return (
    <>
      <PageHero
        eyebrow="AI receptionist"
        title="Speak with the AI receptionist"
        lede="Tell us what you need help with and we will point you to the right place — or connect you with a member of the team."
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
            The AI receptionist is currently unavailable. Please use the contact page.
          </p>
        )}
      </Section>
    </>
  );
}
