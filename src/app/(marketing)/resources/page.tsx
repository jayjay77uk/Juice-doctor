import type { Metadata } from 'next';
import Link from 'next/link';
import { createMetadata } from '@/config/metadata';
import { resources as resourcesService } from '@/services';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Media } from '@/components/ui/media';

export const metadata: Metadata = createMetadata({
  title: 'Resources',
  description: 'Articles, guides and recipes to help you restore your health from the inside out.',
  path: '/resources',
});

const categoryLabel = {
  article: 'Article',
  guide: 'Guide',
  recipe: 'Recipe',
  video: 'Video',
} as const;

export default async function ResourcesPage() {
  const result = await resourcesService.list();
  const resources = result.ok ? result.data.items : [];

  return (
    <>
      <PageHero
        eyebrow="Learn"
        title="Resources"
        lede="Practical, grounded reading on hydration, elimination, rest, nutrition and movement — the five pillars in everyday life."
      />
      <Section tone="default" spacing="lg">
        {resources.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <Card key={r.id} padded={false} interactive className="group flex flex-col overflow-hidden">
                <Link href={`/resources/${r.slug}`} className="flex h-full flex-col">
                  <Media image={r.image} rounded={false} sizes="(max-width:768px) 100vw, 33vw" />
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <div className="flex items-center gap-2">
                      <Badge tone="accent">{categoryLabel[r.category]}</Badge>
                      <span className="text-xs text-muted-foreground">{r.readingTimeLabel}</span>
                    </div>
                    <h2 className="font-serif text-lg text-foreground group-hover:text-primary">
                      {r.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">{r.excerpt}</p>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Articles are on their way.</p>
        )}
      </Section>
    </>
  );
}
