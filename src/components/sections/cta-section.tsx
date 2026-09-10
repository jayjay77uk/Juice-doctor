import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { routes } from '@/config/routes';
import { Container } from '@/components/ui/container';

export function CtaSection({
  title = 'A more connected way to move your wellbeing forward.',
  body = 'Start with one conversation. Makela can help you understand where to begin and which specialist role fits what you need next.',
  primaryHref = routes.assistant.href,
  primaryLabel = 'Ask Makela now',
  secondaryHref = routes.specialists.href,
  secondaryLabel = 'Meet the specialists',
}: {
  title?: string;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="bg-[#fffaf2] py-16 sm:py-24">
      <Container>
        <div className="brand-glow relative overflow-hidden rounded-[2.2rem] bg-[#0a0a0a] px-6 py-14 text-white shadow-[var(--shadow-soft-lg)] sm:px-12 sm:py-16 lg:px-16 lg:py-20">
          <div className="bg-grain pointer-events-none absolute inset-0 opacity-20" aria-hidden />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f2c92a]">Your next step</p>
              <h2 className="mt-4 max-w-3xl text-h1 text-white">{title}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">{body}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link href={primaryHref} className="brand-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-[#111]">
                {primaryLabel} <ArrowRight className="size-4" />
              </Link>
              <Link href={secondaryHref} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 px-6 text-sm font-semibold text-white hover:bg-white/[0.06]">
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
