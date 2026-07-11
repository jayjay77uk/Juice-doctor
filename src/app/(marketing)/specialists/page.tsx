import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { specialists } from '@/services/specialists';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { SpecialistCard } from '@/components/sections/specialist-card';
import { Button } from '@/components/ui/button';
import { CtaSection } from '@/components/sections/cta-section';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = createMetadata({
  title: 'Specialist AIs',
  description: 'Your AI wellness team — subscribe to a specialist AI for the pillar you want to master.',
  path: '/specialists',
});

export default async function SpecialistsPage() {
  const result = await specialists.catalogue();
  const list = result.ok ? result.data : [];

  return (
    <>
      <PageHero
        eyebrow="Your AI wellness team"
        title="Meet the specialist AIs"
        lede="Each specialist AI is a dedicated coach for one part of your reset — with its own knowledge, memory and personality. Subscribe to the one you need, or let our receptionist match you."
      >
        <Button asChild size="lg">
          <Link href="/start">
            <Sparkles className="size-4" /> Not sure? Ask the receptionist
          </Link>
        </Button>
      </PageHero>

      <Section tone="default" spacing="lg">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((specialist) => (
            <SpecialistCard key={specialist.id} specialist={specialist} />
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-border bg-surface-muted p-6 text-center sm:p-8">
          <h2 className="text-h3 text-foreground">Not sure which specialist is right?</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Our AI receptionist will ask a few quick questions and match you with the best fit — or
            connect you with a human expert.
          </p>
          <Button asChild className="mt-5">
            <Link href="/start">
              Talk to the receptionist <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      <CtaSection
        title="Your AI wellness team, on demand"
        body="One receptionist to guide you, specialists to coach you, and a human expert when you need one."
        primaryLabel="Get matched now"
        primaryHref="/start"
        secondaryLabel="How it works"
        secondaryHref="/herne-protocol"
      />
    </>
  );
}
