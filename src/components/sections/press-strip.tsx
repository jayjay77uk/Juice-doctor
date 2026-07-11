import * as React from 'react';
import { site } from '@/content/site';
import { Container } from '@/components/ui/container';
import { ph } from '@/content/placeholder';

/**
 * "As featured in" strip. Uses styled wordmarks as placeholders — real,
 * verified media logos are supplied by the client before the demo.
 */
export function PressStrip() {
  return (
    <section className="border-y border-border bg-cream-50 py-8">
      <Container>
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {ph.eyebrow}
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-16">
          {site.pressLogos.map((name) => (
            <li
              key={name}
              className="font-serif text-xl text-ink-500/70 transition-colors hover:text-ink-700 sm:text-2xl"
            >
              {name}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
