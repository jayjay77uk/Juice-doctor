import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { programmes as programmesService } from '@/services';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { ProgrammeCard } from '@/components/sections/programme-card';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Our programmes',
  description: 'Explore available programmes and contact the team about joining.',
  path: '/programmes',
});

export default async function ProgrammesPage() {
  const result = await programmesService.list();
  const programmes = result.ok ? result.data.items : [];

  return (
    <>
      <PageHero
        eyebrow="Our programmes"
        title="Browse our programmes"
        lede="Explore available programmes and contact the team about joining."
      />
      <Section tone="default" spacing="lg">
        {programmes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {programmes.map((programme) => (
              <ProgrammeCard key={programme.id} programme={programme} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {result.ok
              ? 'No programmes are available right now. Please check back later.'
              : 'Programmes could not be loaded. Please try again later.'}
          </p>
        )}
      </Section>
      <CtaSection />
    </>
  );
}
