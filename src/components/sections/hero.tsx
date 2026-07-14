import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { routes } from '@/config/routes';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Media } from '@/components/ui/media';

/**
 * Home hero — the committed "art-directed split-editorial" concept.
 * Fluid display headline + CTAs on the left; a graded portrait with a floating
 * chip on the right. Copy is clear English placeholder text until final approved
 * wording is supplied. Static/RSC — no client JS.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream-50">
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <Container className="relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="reveal inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-accent-strong" />
            Your Wellbeing Institute
          </span>
          <h1 className="reveal reveal-2 text-display text-foreground">
            Meet Makela,
            <span className="block text-primary">your wellbeing concierge</span>
          </h1>
          <p className="reveal reveal-3 measure text-lg text-muted-foreground sm:text-xl">
            Makela listens first, then coordinates a team of eight specialists around one shared care plan —
            so your wellbeing support always works together.
          </p>
          <div className="reveal reveal-3 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={routes.assistant.href}>
                Ask Makela to guide me <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" intent="outline">
              <Link href={routes.specialists.href}>Meet your team</Link>
            </Button>
          </div>
          <dl className="reveal reveal-4 mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {[
              { v: '8', l: 'Wellbeing specialists' },
              { v: '1', l: 'Shared care plan' },
              { v: '24/7', l: 'Always available' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col">
                <dt className="font-serif text-2xl text-foreground">{s.v}</dt>
                <dd className="text-sm text-muted-foreground">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="reveal reveal-2 relative">
          <Media
            image={{ alt: 'Makela, your wellbeing concierge', tone: 'teal', ratio: '4/5' }}
            className="shadow-[var(--shadow-soft-lg)]"
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
          />
          <div className="absolute -bottom-5 -left-4 max-w-[15rem] rounded-2xl border border-border bg-surface/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur sm:-left-6">
            <p className="font-serif text-3xl text-primary">Makela</p>
            <p className="text-sm text-muted-foreground">
              Your concierge
              <span className="mt-0.5 block text-xs text-muted-foreground/70">Listens first</span>
            </p>
          </div>
          <div className="absolute -right-3 top-6 hidden rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur sm:block">
            <p className="text-sm font-medium text-foreground">“Speak naturally, in your language.”</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
