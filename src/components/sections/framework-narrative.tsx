'use client';

import * as React from 'react';
import { frameworkPillars } from '@/content/framework';
import type { BrandTone } from '@/types/content';
import { cn } from '@/lib/cn';

/**
 * The signature design device: a scroll-linked vertical narrative through the
 * five framework pillars. A sticky rail tracks the active pillar as you scroll;
 * each pillar reveals as it enters view. Degrades to a clean stacked layout
 * with no motion when reduced-motion is preferred (transitions are neutralised
 * globally and the rail simply shows all letters).
 */

const toneText: Record<BrandTone, string> = {
  teal: 'text-teal-600',
  green: 'text-green-600',
  amber: 'text-amber-600',
  sage: 'text-teal-500',
  ink: 'text-ink-900',
};
const toneDot: Record<BrandTone, string> = {
  teal: 'bg-teal-600',
  green: 'bg-green-600',
  amber: 'bg-amber-500',
  sage: 'bg-teal-500',
  ink: 'bg-ink-900',
};

export function FrameworkNarrative() {
  const [active, setActive] = React.useState(0);
  const refs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    for (const el of refs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.6fr] lg:gap-16">
      {/* Sticky rail */}
      <div className="lg:sticky lg:top-[calc(var(--header-h)+3rem)] lg:h-fit">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          The five pillars
        </p>
        <div className="flex gap-2 lg:flex-col lg:gap-1">
          {frameworkPillars.map((pillar, i) => {
            const on = i === active;
            return (
              <button
                key={pillar.key}
                type="button"
                onClick={() => refs.current[i]?.scrollIntoView({ block: 'center' })}
                className={cn(
                  'group flex items-center gap-4 rounded-xl px-2 py-2 text-left transition-colors',
                  on ? 'lg:bg-surface' : 'hover:bg-surface/60',
                )}
                aria-current={on ? 'true' : undefined}
              >
                <span
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-full font-serif text-xl transition-all lg:size-14 lg:text-2xl',
                    on
                      ? cn('bg-surface shadow-[var(--shadow-crisp)]', toneText[pillar.tone])
                      : 'bg-surface-muted text-muted-foreground',
                  )}
                >
                  {pillar.letter}
                </span>
                <span className={cn('hidden lg:block', on ? 'text-foreground' : 'text-muted-foreground')}>
                  <span className="block font-medium">{pillar.name}</span>
                  <span className="block text-sm text-muted-foreground">{pillar.tagline}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pillar panels */}
      <div className="flex flex-col gap-6">
        {frameworkPillars.map((pillar, i) => (
          <div
            key={pillar.key}
            data-index={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={cn(
              'rounded-2xl border bg-surface p-7 transition-all duration-500 sm:p-9',
              i === active ? 'border-border-strong shadow-[var(--shadow-soft)]' : 'border-border',
            )}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className={cn('size-2.5 rounded-full', toneDot[pillar.tone])} aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Pillar {i + 1} of 5
              </span>
            </div>
            <h3 className="text-h2">
              <span className={cn('font-serif', toneText[pillar.tone])}>{pillar.letter}</span>
              <span className="text-foreground">{pillar.name.slice(1)}</span>
            </h3>
            <p className="mt-1 font-serif text-lg text-muted-foreground">{pillar.tagline}</p>
            <p className="measure mt-4 text-muted-foreground">{pillar.description}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {pillar.points.map((point, i) => (
                <li
                  key={i}
                  className="rounded-full bg-surface-muted px-3 py-1.5 text-sm text-foreground"
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
