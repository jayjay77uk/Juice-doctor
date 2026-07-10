'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { PROTOTYPE_BANNER_TEXT, config } from '@/config/app';

/**
 * The "Prototype Environment" banner. Renders only in prototype mode. It is a
 * fixed-height element at the very top of the document; the sticky header's
 * offset is derived from `--banner-h` so the two stack and never overlap.
 * Dismissible per session (re-shown on reload).
 */
export function PrototypeBanner() {
  const [dismissed, setDismissed] = React.useState(false);

  if (!config.isPrototype || dismissed) return null;

  return (
    <div
      className="relative z-50 flex items-center justify-center gap-3 bg-ink-900 px-4 text-center text-cream-50 print:hidden"
      style={{ minHeight: 'var(--banner-h)' }}
      role="region"
      aria-label="Prototype notice"
    >
      <p className="py-1.5 text-xs font-medium tracking-wide sm:text-[0.8rem]">
        <span aria-hidden className="mr-2 inline-block size-1.5 rounded-full bg-amber-500 align-middle" />
        {PROTOTYPE_BANNER_TEXT}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss prototype notice"
        className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-cream-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream-50"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
