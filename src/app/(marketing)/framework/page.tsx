import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { ph } from '@/content/placeholder';
import { frameworkFaqs, frameworkStats } from '@/content/framework';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { FrameworkNarrative } from '@/components/sections/framework-narrative';
import { StatBand } from '@/components/sections/stat-band';
import { SectionHeading } from '@/components/sections/section-heading';
import { Accordion } from '@/components/ui/accordion';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: ph.metaTitle,
  description: ph.metaDescription,
  path: '/framework',
});

export default function FrameworkPage() {
  return (
    <>
      <PageHero
        eyebrow={ph.eyebrow}
        title={ph.heading}
        lede={ph.lead}
      />

      <Section tone="default" spacing="lg">
        <FrameworkNarrative />
      </Section>

      <StatBand heading={ph.subheading} stats={frameworkStats} tone="inverse" />

      <Section tone="cream" spacing="lg" containerSize="narrow">
        <SectionHeading eyebrow={ph.eyebrow} title={ph.subheading} />
        <div className="mt-8">
          <Accordion items={frameworkFaqs} />
        </div>
      </Section>

      <CtaSection
        title={ph.heading}
        primaryLabel={ph.cta}
        primaryHref="/assessment"
      />
    </>
  );
}
