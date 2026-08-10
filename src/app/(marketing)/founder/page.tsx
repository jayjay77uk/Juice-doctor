import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { site } from '@/content/site';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Media } from '@/components/ui/media';
import { Badge } from '@/components/ui/badge';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Our founder',
  description: 'This is placeholder text in clear English. Final approved wording will be supplied later.',
  path: '/founder',
});

export default function FounderPage() {
  return (
    <>
      <PageHero eyebrow="Founder" title="Our founder" lede="This is placeholder text in clear English. Final approved wording will be supplied later." />

      <Section tone="default" spacing="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:h-fit">
            <Media image={{ alt: 'Placeholder image', tone: 'teal', ratio: '4/5' }} className="shadow-[var(--shadow-soft)]" />
            <div className="mt-5 flex flex-wrap gap-2">
              {site.founder.credentials.map((c, i) => (
                <Badge key={i} tone="primary">
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 text-lg leading-relaxed text-foreground/90">
            <p className="measure font-serif text-2xl text-foreground">This is placeholder text in clear English. Final approved wording will be supplied later.</p>
            <p className="measure text-muted-foreground">This is placeholder text in clear English. It stands in for the final content until approved wording is supplied.</p>
            <p className="measure text-muted-foreground">This is placeholder text in clear English. It stands in for the final content until approved wording is supplied.</p>
            <p className="measure text-muted-foreground">This is placeholder text in clear English. It stands in for the final content until approved wording is supplied.</p>
            <p className="rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
              A full, client-approved biography and verified credentials are supplied before
              launch. Placeholder detail is shown here pending client-supplied copy.
            </p>
          </div>
        </div>
      </Section>

      <CtaSection />
    </>
  );
}
