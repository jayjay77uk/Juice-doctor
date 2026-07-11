import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { ph } from '@/content/placeholder';
import { herneFaqs, herneStats } from '@/content/herne';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { HerneNarrative } from '@/components/sections/herne-narrative';
import { StatBand } from '@/components/sections/stat-band';
import { SectionHeading } from '@/components/sections/section-heading';
import { Accordion } from '@/components/ui/accordion';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: ph.metaTitle,
  description: ph.metaDescription,
  path: '/herne-protocol',
});

export default function HernePage() {
  return (
    <>
      <PageHero
        eyebrow={ph.eyebrow}
        title={ph.heading}
        lede={ph.lead}
      />

      <Section tone="default" spacing="lg">
        <HerneNarrative />
      </Section>

      <StatBand heading={ph.subheading} stats={herneStats} tone="inverse" />

      <Section tone="cream" spacing="lg" containerSize="narrow">
        <SectionHeading eyebrow={ph.eyebrow} title={ph.subheading} />
        <div className="mt-8">
          <Accordion items={herneFaqs} />
        </div>
      </Section>

      <CtaSection
        title={ph.heading}
        primaryLabel={ph.cta}
        primaryHref="/body-mot"
      />
    </>
  );
}
