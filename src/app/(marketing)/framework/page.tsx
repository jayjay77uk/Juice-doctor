import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { frameworkFaqs, frameworkStats } from '@/content/framework';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { FrameworkNarrative } from '@/components/sections/framework-narrative';
import { StatBand } from '@/components/sections/stat-band';
import { SectionHeading } from '@/components/sections/section-heading';
import { Accordion } from '@/components/ui/accordion';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Our framework',
  description:
    'This is placeholder text in clear English. Final wording will be supplied later.',
  path: '/framework',
});

export default function FrameworkPage() {
  return (
    <>
      <PageHero
        eyebrow="Our framework"
        title="How our framework works"
        lede="This is placeholder text in clear English. Final wording will be supplied later."
      />

      <Section tone="default" spacing="lg">
        <FrameworkNarrative />
      </Section>

      <StatBand heading="Results at a glance" stats={frameworkStats} tone="inverse" />

      <Section tone="cream" spacing="lg" containerSize="narrow">
        <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
        <div className="mt-8">
          <Accordion items={frameworkFaqs} />
        </div>
      </Section>

      <CtaSection
        title="Ready to get started?"
        primaryLabel="Take the assessment"
        primaryHref="/assessment"
      />
    </>
  );
}
