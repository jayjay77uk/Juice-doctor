import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '@/lib/cn';

const cardVariants = tv({
  base: 'rounded-2xl border transition-shadow duration-300',
  variants: {
    tone: {
      surface: 'border-border bg-surface',
      muted: 'border-border bg-surface-muted',
      outline: 'border-border-strong bg-transparent',
    },
    interactive: {
      true: 'hover:shadow-[var(--shadow-soft)] focus-within:shadow-[var(--shadow-soft)]',
    },
    padded: {
      true: 'p-6 sm:p-7',
    },
  },
  defaultVariants: { tone: 'surface', padded: true },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, tone, interactive, padded, ...props }: CardProps) {
  return <div className={cn(cardVariants({ tone, interactive, padded }), className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-h3 text-foreground', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-2 text-muted-foreground', className)} {...props} />;
}
