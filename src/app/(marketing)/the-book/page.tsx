import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Media } from '@/components/ui/media';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/sections/coming-soon';

export const metadata: Metadata = createMetadata({
  title: 'The Irrefutable Power of Water',
  description:
    'The book on chronic dehydration and how understanding your body’s need for water changes everything.',
  path: '/the-book',
});

const chapters = [
  'Why you’re not broken — you may be chronically under-watered',
  'What cellular hydration actually means',
  'Water, energy and the myth of “just drink more”',
  'Hydration and the other four HERNE pillars',
];

export default function TheBookPage() {
  return (
    <>
      <PageHero
        eyebrow="The book"
        title="The Irrefutable Power of Water"
        lede="This isn’t about drinking more water. It’s about understanding how your body actually works — and why chronic dehydration quietly drives fatigue, pain, poor sleep and brain fog."
      />
      <Section tone="default" spacing="lg">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="mx-auto w-full max-w-sm">
            <Media
              image={{ alt: 'Cover of The Irrefutable Power of Water', tone: 'teal', ratio: '3/4' }}
              className="shadow-[var(--shadow-soft-lg)]"
              priority
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-4xl text-foreground">£35</span>
              <span className="text-sm text-muted-foreground">Signed hardback</span>
            </div>
            <p className="measure text-lg text-muted-foreground">
              A physiology-first, evidence-informed guide — grounded, human and free of miracle
              claims. Read it and you’ll never think about a glass of water the same way again.
            </p>
            <div>
              <h2 className="text-h3">Inside the book</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {chapters.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-foreground">
                    <Check className="mt-1 size-4 shrink-0 text-secondary" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <ComingSoon
              title="Checkout coming in the full platform"
              body="In production, you’ll be able to buy the book securely here with signed-copy and digital options. Payments are not connected in this prototype."
              className="mt-2 text-left"
            />
            <Button size="lg" disabled className="w-fit">
              Buy the book — coming soon
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
