'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { FaqItem } from '@/types/content';

export function Accordion({ items, className }: { items: FaqItem[]; className?: string }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className={cn('divide-y divide-border', className)}>
      {items.map((item, i) => (
        <AccordionPrimitive.Item key={i} value={`item-${i}`} className="py-1">
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger
              className={cn(
                'group flex w-full items-center justify-between gap-4 py-4 text-left',
                'text-lg font-medium text-foreground',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
              )}
            >
              <span className="font-serif">{item.question}</span>
              <ChevronDown
                className="size-5 shrink-0 text-primary transition-transform duration-300 group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-none">
            <p className="measure pb-5 text-muted-foreground">{item.answer}</p>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
