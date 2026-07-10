import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '@/lib/cn';

const badgeVariants = tv({
  base: 'inline-flex items-center gap-1.5 rounded-full text-xs font-medium leading-none',
  variants: {
    tone: {
      neutral: 'bg-surface-muted text-muted-foreground',
      primary: 'bg-teal-100 text-teal-700',
      secondary: 'bg-green-100 text-green-700',
      accent: 'bg-amber-50 text-amber-700',
      outline: 'border border-border-strong text-muted-foreground',
    },
    size: {
      sm: 'px-2.5 py-1',
      md: 'px-3 py-1.5',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'sm' },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
