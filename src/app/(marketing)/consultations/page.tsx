import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { consultations as consultationsService } from '@/services';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Consultations',
  description: 'One-to-one and group consultations — the entry points to working with Erran.',
  path: '/consultations',
});

export default async function ConsultationsPage() {
  const result = await consultationsService.list();
  const consultations = result.ok ? result.data : [];

  return (
    <>
      <PageHero
        eyebrow="Work with Erran"
        title="Consultations"
        lede="Start the conversation. Every path begins with understanding your body — book the session that fits where you are."
      />
      <Section tone="default" spacing="lg">
        <div className="grid gap-6 md:grid-cols-3">
          {consultations.map((c) => (
            <Card key={c.id} interactive className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Badge tone="primary">{c.durationLabel}</Badge>
                <Badge tone="outline">{c.priceLabel}</Badge>
              </div>
              <div>
                <h3 className="text-h3 text-foreground">{c.title}</h3>
                <p className="mt-2 text-muted-foreground">{c.summary}</p>
              </div>
              <ul className="flex flex-col gap-2">
                {c.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">For: {c.forWhom}</p>
              <Button asChild full className="mt-auto">
                <Link href={`/book?service=${c.slug}`}>Book {c.title.toLowerCase()}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </Section>
      <CtaSection />
    </>
  );
}
