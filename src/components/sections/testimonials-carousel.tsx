'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import type { Testimonial } from '@/types/content';
import { Media } from '@/components/ui/media';
import { cn } from '@/lib/cn';

/** Scroll-snap testimonial carousel with keyboard-accessible controls. */
export function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const trackRef = React.useRef<HTMLUListElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector('li');
    const amount = card ? card.clientWidth + 20 : track.clientWidth * 0.8;
    track.scrollBy({ left: amount * dir, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {testimonials.map((t) => (
          <li
            key={t.id}
            className="w-[85%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
          >
            <figure className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-surface p-7">
              <Quote className="size-8 text-accent" aria-hidden />
              <blockquote className="flex-1 font-serif text-lg leading-relaxed text-foreground">
                “{t.quote}”
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-border pt-4">
                {t.image && <Media image={t.image} className="size-12 shrink-0" />}
                <div>
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.role}
                    {t.conditionTag ? ` · ${t.conditionTag}` : ''}
                  </p>
                </div>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        {([['Previous', -1, ChevronLeft], ['Next', 1, ChevronRight]] as const).map(
          ([label, dir, Icon]) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => scrollBy(dir)}
              className={cn(
                'grid size-11 place-items-center rounded-full border border-border-strong text-foreground',
                'transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
              )}
            >
              <Icon className="size-5" />
            </button>
          ),
        )}
      </div>
    </div>
  );
}
