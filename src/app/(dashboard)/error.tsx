'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Contained error state for the member dashboard — keeps the app chrome intact. */
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center">
      <h1 className="font-serif text-2xl text-foreground">This page didn’t load</h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong loading your dashboard. Please try again.
      </p>
      <Button onClick={reset} size="sm">
        <RefreshCw className="size-4" /> Try again
      </Button>
    </div>
  );
}
