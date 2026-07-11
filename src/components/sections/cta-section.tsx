import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { routes } from '@/config/routes';
import { site } from '@/content/site';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';

/** Closing call-to-action band. Reused across marketing pages. */
export function CtaSection({
  title = 'Ready to get started?',
  body = 'This is placeholder text written in clear English. Final approved wording will be supplied later.',
  primaryHref = routes.book.href,
  primaryLabel = 'Get in touch',
  secondaryHref = routes.framework.href,
  secondaryLabel = 'Learn more',
}: {
  title?: string;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="bg-background py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-teal-800 px-6 py-14 text-cream-50 sm:px-14 sm:py-16">
          <div className="bg-grain pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-green-600/30 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-start gap-6">
            <p className="font-serif text-sm italic text-cream-200">“{site.ethos}”</p>
            <h2 className="max-w-2xl text-h1 text-cream-50">{title}</h2>
            <p className="measure text-lg text-cream-100/90">{body}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" intent="accent">
                <Link href={primaryHref}>
                  {primaryLabel} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                intent="outline"
                className="border-cream-100/30 text-cream-50 hover:bg-white/10"
              >
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
