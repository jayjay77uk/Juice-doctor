'use client';

import * as React from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-5 text-center">
      <p className="font-serif text-6xl text-primary">Oops</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-h2">Something went wrong</h1>
        <p className="measure text-muted-foreground">This is placeholder text in clear English. Something went wrong while loading this page. Final wording will be supplied later.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RefreshCw className="size-4" /> Try again
        </Button>
        <Button asChild intent="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
