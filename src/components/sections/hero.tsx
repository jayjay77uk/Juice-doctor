import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { routes } from '@/config/routes';
import { site } from '@/content/site';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Media } from '@/components/ui/media';

/**
 * Home hero — the committed "art-directed split-editorial" concept.
 * Fluid display headline + CTAs on the left; a duotone-graded founder portrait
 * with a floating stat chip on the right. Recomposes to portrait-over-headline
 * on mobile. Static/RSC — no client JS.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream-50">
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <Container className="relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="reveal inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-accent-strong" />
            Your AI wellness team · guided by the HERNE Protocol
          </span>
          <h1 className="reveal reveal-2 text-display text-foreground">
            Meet your AI
            <span className="block text-primary">wellness team.</span>
          </h1>
          <p className="reveal reveal-3 measure text-lg text-muted-foreground sm:text-xl">
            Start with our AI receptionist — it understands your goals and matches you with the right
            specialist AI, with a human expert on hand whenever you need one. {site.belief}
          </p>
          <div className="reveal reveal-3 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={routes.start.href}>
                Meet the receptionist <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" intent="outline">
              <Link href={routes.specialists.href}>Browse specialist AIs</Link>
            </Button>
          </div>
          <dl className="reveal reveal-4 mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {[
              { v: '1 receptionist', l: 'your front door' },
              { v: '5 specialists', l: 'one per pillar' },
              { v: 'Human expert', l: 'when it matters' },
            ].map((s) => (
              <div key={s.l} className="flex flex-col">
                <dt className="font-serif text-2xl text-foreground">{s.v}</dt>
                <dd className="text-sm text-muted-foreground">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="reveal reveal-2 relative">
          <Media
            image={{ alt: `${site.founder.name}, ${site.founder.knownAs}`, tone: 'teal', ratio: '4/5' }}
            className="shadow-[var(--shadow-soft-lg)]"
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
          />
          <div className="absolute -bottom-5 -left-4 max-w-[15rem] rounded-2xl border border-border bg-surface/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur sm:-left-6">
            <p className="font-serif text-3xl text-primary">92%</p>
            <p className="text-sm text-muted-foreground">
              reported more daily energy
              <span className="mt-0.5 block text-xs text-muted-foreground/70">self-reported</span>
            </p>
          </div>
          <div className="absolute -right-3 top-6 hidden rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur sm:block">
            <p className="text-sm font-medium text-foreground">“{site.belief}”</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
