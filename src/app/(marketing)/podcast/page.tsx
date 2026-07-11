import type { Metadata } from 'next';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { podcast as podcastService } from '@/services';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Badge } from '@/components/ui/badge';
import { ComingSoon } from '@/components/sections/coming-soon';
import { ph } from '@/content/placeholder';

export const metadata: Metadata = createMetadata({
  title: ph.metaTitle,
  description: ph.metaDescription,
  path: '/podcast',
});

export default async function PodcastPage() {
  const result = await podcastService.list();
  const episodes = result.ok ? result.data.items : [];

  return (
    <>
      <PageHero
        eyebrow={ph.eyebrow}
        title={ph.heading}
        lede={ph.lead}
      />
      <Section tone="default" spacing="lg">
        <ul className="flex flex-col divide-y divide-border">
          {episodes.map((ep) => (
            <li key={ep.id}>
              <Link
                href={`/podcast/${ep.slug}`}
                className="group flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:gap-6"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-teal-100 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Play className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Episode {ep.number} · {ep.publishedLabel}
                  </p>
                  <h2 className="mt-1 font-serif text-xl text-foreground group-hover:text-primary">
                    {ep.title}
                  </h2>
                  <p className="measure mt-1 text-muted-foreground">{ep.summary}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-4" /> {ep.durationLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-12">
          <ComingSoon
            title={ph.short}
            body={ph.body}
          />
        </div>
      </Section>
    </>
  );
}
