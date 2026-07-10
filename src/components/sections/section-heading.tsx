import * as React from 'react';
import { Eyebrow } from '@/components/ui/eyebrow';
import { cn } from '@/lib/cn';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
  as?: 'h1' | 'h2';
}

/** Consistent eyebrow → title → intro block used to open sections. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
  className,
  as: Tag = 'h2',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Tag className={cn(Tag === 'h1' ? 'text-h1' : 'text-h2', 'max-w-2xl')}>{title}</Tag>
      {intro && (
        <p className={cn('measure text-lg text-muted-foreground', align === 'center' && 'mx-auto')}>
          {intro}
        </p>
      )}
    </div>
  );
}
