'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

export interface TabDef {
  value: string;
  label: string;
  content: React.ReactNode;
}

/** A styled, keyboard-accessible tab set (Radix). */
export function Tabs({ tabs, defaultValue }: { tabs: TabDef[]; defaultValue?: string }) {
  const initial = defaultValue ?? tabs[0]?.value;
  return (
    <TabsPrimitive.Root
      {...(initial ? { defaultValue: initial } : {})}
      className="flex flex-col gap-6"
    >
      <TabsPrimitive.List className="flex flex-wrap gap-1 overflow-x-auto rounded-xl border border-border bg-surface-muted p-1">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors',
              'hover:text-foreground',
              'data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-[var(--shadow-crisp)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
            )}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content
          key={tab.value}
          value={tab.value}
          className="focus-visible:outline-none"
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
