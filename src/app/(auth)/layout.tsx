import * as React from 'react';
import Link from 'next/link';
import { site } from '@/content/site';
import { Logo } from '@/components/layout/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-teal-800 p-12 text-cream-50 lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grain pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 size-80 rounded-full bg-green-600/30 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <Logo inverse />
        </div>
        <div className="relative flex flex-col gap-4">
          <p className="font-serif text-3xl leading-tight">“{site.belief}”</p>
          <p className="max-w-sm text-cream-100/90">
            This is placeholder text in clear English. Final approved wording will be supplied later.
          </p>
        </div>
        <p className="relative text-xs text-cream-200/70">
          Prototype environment — for demonstration only.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center bg-cream-50 px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              ← Back to site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
