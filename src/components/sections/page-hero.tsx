import * as React from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { cn } from '@/lib/cn';

/** Standard interior-page header. Keeps every page visually consistent. */
export function PageHero({
  eyebrow,
  title,
  lede,
  children,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-cream-50">
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <Container
        className={cn(
          'relative flex flex-col gap-5 py-14 sm:py-20',
          align === 'center' && 'items-center text-center',
        )}
      >
        {eyebrow && <Eyebrow className="reveal">{eyebrow}</Eyebrow>}
        <h1 className={cn('reveal reveal-2 text-h1', align === 'center' ? 'max-w-3xl' : 'max-w-3xl')}>
          {title}
        </h1>
        {lede && (
          <p
            className={cn(
              'reveal reveal-3 measure text-lg text-muted-foreground sm:text-xl',
              align === 'center' && 'mx-auto',
            )}
          >
            {lede}
          </p>
        )}
        {children && <div className="reveal reveal-3 mt-2">{children}</div>}
      </Container>
    </section>
  );
}
