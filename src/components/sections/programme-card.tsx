import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import type { Programme } from '@/types/content';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Media } from '@/components/ui/media';

const formatLabel: Record<Programme['format'], string> = {
  '1:1': 'One-to-one',
  group: 'Group',
  corporate: 'Corporate',
  'self-paced': 'Self-paced',
};

export function ProgrammeCard({ programme }: { programme: Programme }) {
  return (
    <Card
      padded={false}
      interactive
      className="group flex h-full flex-col overflow-hidden"
    >
      <Media image={programme.image} rounded={false} sizes="(max-width:768px) 100vw, 33vw" />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <Badge tone="primary">{formatLabel[programme.format]}</Badge>
          <Badge tone="outline">{programme.durationLabel}</Badge>
        </div>
        <div>
          <h3 className="text-h3 text-foreground">{programme.title}</h3>
          <p className="mt-2 text-muted-foreground">{programme.summary}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {programme.includes.slice(0, 3).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-secondary" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <span className="font-serif text-lg text-foreground">{programme.priceLabel}</span>
          <Link
            href={`/programmes/${programme.slug}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all"
          >
            View programme <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
