import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Sparkles, MessageCircle, Brain, ShieldCheck } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { specialists } from '@/services/specialists';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Button } from '@/components/ui/button';
import { CtaSection } from '@/components/sections/cta-section';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await specialists.bySlug(slug);
  if (!result.ok) return createMetadata({ title: 'Specialist AI' });
  return createMetadata({ title: result.data.name, description: result.data.product?.tagline ?? result.data.description, path: `/specialists/${slug}` });
}

export default async function SpecialistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await specialists.bySlug(slug);
  if (!result.ok) notFound();
  const s = result.data;
  const product = s.product;

  return (
    <>
      <PageHero eyebrow="Specialist AI" title={s.name} lede={product?.tagline ?? s.description}>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/start">
              <Sparkles className="size-4" /> Get matched
            </Link>
          </Button>
          {product && <span className="font-serif text-lg text-foreground">{product.priceLabel}</span>}
        </div>
      </PageHero>

      <Section tone="default" spacing="lg">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-h2">What this specialist does</h2>
              <p className="measure mt-4 text-lg text-muted-foreground">{s.description}</p>
            </div>
            {product && (
              <div>
                <h3 className="text-h3">What you get</h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {product.expertise.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-foreground">
                      <Check className="mt-1 size-4 shrink-0 text-secondary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Brain, title: 'Its own memory', body: 'Remembers your goals and progress across every conversation.' },
                { icon: ShieldCheck, title: 'Safe by design', body: 'Never diagnoses; escalates to a human when needed.' },
                { icon: MessageCircle, title: 'Always available', body: 'Coaching whenever you need it, on your terms.' },
              ].map((f) => (
                <div key={f.title} className="rounded-2xl border border-border bg-surface p-5">
                  <f.icon className="size-5 text-primary" />
                  <p className="mt-3 font-medium text-foreground">{f.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:h-fit">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="text-sm text-muted-foreground">Subscription</p>
              <p className="mt-1 font-serif text-4xl text-foreground">{product?.priceLabel ?? '—'}</p>
              <p className="mt-1 text-sm text-muted-foreground">Cancel anytime. Includes unlimited coaching.</p>
              <Button size="lg" full className="mt-5" disabled>
                Subscribe (prototype)
              </Button>
              <Button asChild intent="ghost" full className="mt-2">
                <Link href="/start">Ask the receptionist first</Link>
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                Prototype — no payment is taken and no AI is connected. This demonstrates the
                subscription experience only.
              </p>
            </div>
          </aside>
        </div>
      </Section>

      <CtaSection
        title="Bring your whole AI wellness team"
        body="Mix and match specialists, guided by your receptionist, with a human expert on hand."
        primaryLabel="See all specialists"
        primaryHref="/specialists"
        secondaryLabel="Talk to the receptionist"
        secondaryHref="/start"
      />
    </>
  );
}
