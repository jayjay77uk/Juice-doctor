import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import type { AiAgent } from '@/types/ai';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const ACCENT: Record<string, string> = {
  teal: 'bg-teal-100 text-teal-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  sage: 'bg-sage-200 text-teal-800',
};

/** A specialist AI presented as a subscription product. */
export function SpecialistCard({ specialist }: { specialist: AiAgent }) {
  const accent = ACCENT[specialist.product?.accent ?? 'teal'] ?? ACCENT.teal;
  return (
    <Card interactive className="group flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className={cn('grid size-11 place-items-center rounded-full', accent)}>
          <Sparkles className="size-5" />
        </span>
        {specialist.product && (
          <span className="text-right">
            <span className="block font-serif text-lg text-foreground">{specialist.product.priceLabel}</span>
          </span>
        )}
      </div>
      <div>
        <h3 className="text-h3 text-foreground">{specialist.name}</h3>
        <p className="mt-1 text-muted-foreground">{specialist.product?.tagline ?? specialist.description}</p>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {(specialist.product?.expertise ?? []).slice(0, 4).map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-secondary" />
            {item}
          </li>
        ))}
      </ul>
      <Link
        href={`/specialists/${specialist.slug}`}
        className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all"
      >
        View this specialist <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}
