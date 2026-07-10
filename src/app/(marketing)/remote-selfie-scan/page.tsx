import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { selfieScan } from '@/content/features';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { FeatureGrid } from '@/components/sections/feature-grid';
import { Accordion } from '@/components/ui/accordion';
import { SelfieScanFlow } from '@/components/sections/selfie-scan-flow';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: selfieScan.title,
  description: selfieScan.lede,
  path: '/remote-selfie-scan',
});

export default function SelfieScanPage() {
  return (
    <>
      <PageHero eyebrow={selfieScan.eyebrow} title={selfieScan.title} lede={selfieScan.lede} />

      {/* The interactive mock flow — the point of the feature. */}
      <Section tone="default" spacing="lg" containerSize="narrow">
        <SelfieScanFlow />
      </Section>

      <Section tone="sage" spacing="lg">
        <SectionHeading eyebrow="Why people love it" title="Your easiest first step" />
        <div className="mt-10">
          <FeatureGrid items={selfieScan.what} />
        </div>
      </Section>

      <Section tone="default" spacing="lg" containerSize="narrow">
        <SectionHeading eyebrow="How it works" title="Three steps, two minutes" />
        <ol className="mt-8 flex flex-col gap-6">
          {selfieScan.steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-serif text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <h3 className="font-serif text-lg text-foreground">{step.title}</h3>
                <p className="mt-1 text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-12">
          <SectionHeading eyebrow="Questions" title="Privacy & what to expect" />
          <div className="mt-6">
            <Accordion items={selfieScan.faqs} />
          </div>
        </div>
      </Section>

      <CtaSection
        title="Go deeper with a Body MOT"
        primaryLabel="Explore the Body MOT"
        primaryHref="/body-mot"
      />
    </>
  );
}
