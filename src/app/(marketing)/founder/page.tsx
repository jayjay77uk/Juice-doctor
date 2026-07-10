import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { site } from '@/content/site';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Media } from '@/components/ui/media';
import { Badge } from '@/components/ui/badge';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: `${site.founder.name} — ${site.founder.knownAs}`,
  description: site.founder.shortBio,
  path: '/founder',
});

export default function FounderPage() {
  return (
    <>
      <PageHero eyebrow="The founder" title={site.founder.name} lede={`Known to millions as ${site.founder.knownAs}.`} />

      <Section tone="default" spacing="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:h-fit">
            <Media image={{ alt: site.founder.name, tone: 'teal', ratio: '4/5' }} className="shadow-[var(--shadow-soft)]" />
            <div className="mt-5 flex flex-wrap gap-2">
              {site.founder.credentials.map((c) => (
                <Badge key={c} tone="primary">
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 text-lg leading-relaxed text-foreground/90">
            <p className="measure font-serif text-2xl text-foreground">{site.founder.shortBio}</p>
            <p className="measure text-muted-foreground">
              At twelve years old, {site.founder.name.split(' ')[0]} watched his father survive
              multiple heart attacks before dying after his ninth — leaving a young family to
              navigate loss and hardship. It planted a question that never left him: why does
              conventional medicine so often manage symptoms rather than restore health?
            </p>
            <p className="measure text-muted-foreground">
              That question became a career spanning clinical nutrition, regenerative health and
              natural-health research — and a body of work seen by millions on television. It
              ultimately crystallised into the HERNE Protocol: a five-pillar system for restoring the
              body’s inner environment.
            </p>
            <p className="measure text-muted-foreground">
              Today his mission is simple and vast in equal measure — to help people rediscover that
              their body is not broken, only responsive, and to give them the tools to prove it for
              themselves.
            </p>
            <p className="rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
              Prototype note: a full, client-approved biography and verified credentials are supplied
              before launch. Placeholder detail is shown here for demonstration.
            </p>
          </div>
        </div>
      </Section>

      <CtaSection />
    </>
  );
}
