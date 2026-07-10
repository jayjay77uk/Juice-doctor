import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { programmes as programmesService } from '@/services';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { ProgrammeCard } from '@/components/sections/programme-card';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Programmes',
  description: 'HERNE-Protocol-led coaching programmes, from a 21-day reset to full transformation.',
  path: '/programmes',
});

export default async function ProgrammesPage() {
  const result = await programmesService.list();
  const programmes = result.ok ? result.data.items : [];

  return (
    <>
      <PageHero
        eyebrow="Work with Erran"
        title="Programmes built around your body"
        lede="Every programme is delivered through the HERNE Protocol and adapted to where your body actually is. Choose the level of support that fits your life."
      />
      <Section tone="default" spacing="lg">
        {programmes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {programmes.map((programme) => (
              <ProgrammeCard key={programme.id} programme={programme} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Programmes are being prepared. Please check back soon.</p>
        )}
      </Section>
      <CtaSection />
    </>
  );
}
