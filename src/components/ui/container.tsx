import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '@/lib/cn';

const containerVariants = tv({
  base: 'mx-auto w-full px-5 sm:px-8',
  variants: {
    size: {
      default: 'max-w-6xl',
      narrow: 'max-w-3xl',
      prose: 'max-w-2xl',
      wide: 'max-w-7xl',
    },
  },
  defaultVariants: { size: 'default' },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: React.ElementType;
}

export function Container({ className, size, as: Tag = 'div', ...props }: ContainerProps) {
  return <Tag className={cn(containerVariants({ size }), className)} {...props} />;
}
