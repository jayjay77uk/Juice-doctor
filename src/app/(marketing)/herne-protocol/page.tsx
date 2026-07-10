import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { herneFaqs, herneStats } from '@/content/herne';
import { site } from '@/content/site';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { HerneNarrative } from '@/components/sections/herne-narrative';
import { StatBand } from '@/components/sections/stat-band';
import { SectionHeading } from '@/components/sections/section-heading';
import { Accordion } from '@/components/ui/accordion';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'The HERNE Protocol',
  description:
    'The five pillars of restoration — Hydration, Elimination, Rest, Nutrition and Exercise — connected into one system.',
  path: '/herne-protocol',
});

export default function HernePage() {
  return (
    <>
      <PageHero
        eyebrow="The Method"
        title="The HERNE Protocol"
        lede={`Five pillars, one system. HERNE is how we restore your inner environment — because ${site.belief.toLowerCase()}`}
      />

      <Section tone="default" spacing="lg">
        <HerneNarrative />
      </Section>

      <StatBand heading="What restoration looks like" stats={herneStats} tone="inverse" />

      <Section tone="cream" spacing="lg" containerSize="narrow">
        <SectionHeading eyebrow="Questions" title="Common questions about the protocol" />
        <div className="mt-8">
          <Accordion items={herneFaqs} />
        </div>
      </Section>

      <CtaSection
        title="Ready to restore your inner environment?"
        primaryLabel="Start with a Body MOT"
        primaryHref="/body-mot"
      />
    </>
  );
}
