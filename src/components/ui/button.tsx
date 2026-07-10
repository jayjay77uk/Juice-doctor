import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '@/lib/cn';

export const buttonVariants = tv({
  base: [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium',
    'transition-[transform,background-color,color,box-shadow] duration-200 ease-[var(--ease-standard)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
    'disabled:pointer-events-none disabled:opacity-55 active:translate-y-px',
  ],
  variants: {
    intent: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-[var(--shadow-crisp)]',
      secondary: 'bg-secondary text-secondary-foreground hover:brightness-[0.95]',
      accent: 'bg-accent text-accent-foreground hover:bg-accent-strong',
      outline: 'border border-border-strong bg-transparent text-foreground hover:bg-surface-muted',
      ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
      link: 'bg-transparent text-primary underline-offset-4 hover:underline rounded-none px-0',
    },
    size: {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-[0.95rem]',
      lg: 'h-13 px-8 text-base',
    },
    full: { true: 'w-full' },
  },
  defaultVariants: { intent: 'primary', size: 'md' },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, intent, size, full, asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ intent, size, full }), className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  );
});
