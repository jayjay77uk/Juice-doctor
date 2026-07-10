import * as React from 'react';
import type { Stat } from '@/types/content';
import { Section } from '@/components/ui/section';
import { Reveal } from '@/components/ui/reveal';

/** A band of headline figures. Surfaces a footnote when any stat is self-reported. */
export function StatBand({
  stats,
  heading,
  tone = 'inverse',
}: {
  stats: Stat[];
  heading?: string;
  tone?: 'inverse' | 'surface';
}) {
  const hasNote = stats.some((s) => s.note);
  return (
    <Section tone={tone} spacing="md">
      {heading && (
        <h2 className="mb-10 max-w-2xl text-h2 text-current">{heading}</h2>
      )}
      <dl className="grid gap-8 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 80}>
            <div className="flex flex-col gap-1">
              <dt className="font-serif text-5xl text-current sm:text-6xl">{stat.value}</dt>
              <dd className="text-current/80">{stat.label}</dd>
            </div>
          </Reveal>
        ))}
      </dl>
      {hasNote && (
        <p className="mt-8 text-sm text-current/60">
          Figures are self-reported by clients of the existing practice and are shown for
          illustration in this prototype.
        </p>
      )}
    </Section>
  );
}
