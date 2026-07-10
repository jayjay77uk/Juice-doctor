import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '@/lib/cn';
import { Container, type ContainerProps } from './container';

const sectionVariants = tv({
  base: 'relative',
  variants: {
    tone: {
      default: 'bg-background text-foreground',
      surface: 'bg-surface text-foreground',
      muted: 'bg-surface-muted text-foreground',
      sage: 'bg-sage-100 text-foreground',
      inverse: 'bg-teal-800 text-cream-50',
      cream: 'bg-cream-50 text-foreground',
    },
    spacing: {
      sm: 'py-12',
      md: 'py-16 sm:py-20',
      lg: 'py-20 sm:py-28',
    },
  },
  defaultVariants: { tone: 'default', spacing: 'md' },
});

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  /** Wrap children in a Container automatically. Set false for full-bleed content. */
  contained?: boolean;
  containerSize?: ContainerProps['size'];
}

export function Section({
  className,
  tone,
  spacing,
  contained = true,
  containerSize,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(sectionVariants({ tone, spacing }), className)} {...props}>
      {contained ? <Container size={containerSize}>{children}</Container> : children}
    </section>
  );
}
