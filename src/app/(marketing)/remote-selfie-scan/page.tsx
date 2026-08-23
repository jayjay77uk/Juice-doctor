import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { selfieScan } from '@/content/features';
import { selfieScanProviderStatus } from '@/services/selfie-scan/provider';
import { SelfieScanLaunchCard } from '@/components/selfie-scan/selfie-scan-launch-card';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { FeatureGrid } from '@/components/sections/feature-grid';
import { Accordion } from '@/components/ui/accordion';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Remote selfie scan',
  description: 'Remote Selfie Scan assessment pathway. Availability depends on the approved scan provider being connected.',
  path: '/remote-selfie-scan',
});

export default function SelfieScanPage() {
  const provider = selfieScanProviderStatus();
  return (
    <>
      <PageHero
        eyebrow="Remote selfie scan"
        title="Remote selfie scan"
        lede="Complete a remote scan through the approved provider when the service is connected."
      />

      <Section tone="default" spacing="lg" containerSize="narrow">
        <SelfieScanLaunchCard configured={provider.configured} provider={provider.provider} />
      </Section>

      <Section tone="sage" spacing="lg">
        <SectionHeading eyebrow="Overview" title="What the scan covers" />
        <div className="mt-10">
          <FeatureGrid items={selfieScan.what} />
        </div>
      </Section>

      <Section tone="default" spacing="lg" containerSize="narrow">
        <SectionHeading eyebrow="Process" title="How it works" />
        <ol className="mt-8 flex flex-col gap-6">
          {selfieScan.steps.map((step, i) => (
            <li key={i} className="flex gap-4">
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
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <div className="mt-6">
            <Accordion items={selfieScan.faqs} />
          </div>
        </div>
      </Section>

      <CtaSection
        title="Ready to get started?"
        primaryLabel="Start an assessment"
        primaryHref="/assessment"
      />
    </>
  );
}
