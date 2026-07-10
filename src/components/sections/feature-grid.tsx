import * as React from 'react';
import { Reveal } from '@/components/ui/reveal';
import { cn } from '@/lib/cn';

export interface FeatureItem {
  title: string;
  body: string;
}

/** A responsive grid of feature/benefit cards. Used across signature pages. */
export function FeatureGrid({ items, columns = 3 }: { items: FeatureItem[]; columns?: 2 | 3 }) {
  return (
    <ul className={cn('grid gap-5 sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3')}>
      {items.map((item, i) => (
        <Reveal as="li" key={item.title} delay={i * 70}>
          <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
            <span className="grid size-10 place-items-center rounded-full bg-teal-100 font-serif text-lg text-primary">
              {i + 1}
            </span>
            <h3 className="text-h3 text-foreground">{item.title}</h3>
            <p className="text-muted-foreground">{item.body}</p>
          </div>
        </Reveal>
      ))}
    </ul>
  );
}
