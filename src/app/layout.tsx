import type { Metadata, Viewport } from 'next';
import { baseMetadata } from '@/config/metadata';
import './globals.css';

/**
 * Fonts: the design calls for Fraunces (display) + Inter (text). To keep the
 * platform fast and offline-resilient, we render with high-quality system
 * serif/sans stacks (see `--font-serif` / `--font-sans` in globals.css). To ship
 * the exact faces, drop self-hosted woff2 files in and wire `next/font/local`,
 * setting `--font-fraunces` / `--font-inter` — no other change is needed.
 */

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  themeColor: '#0e5c63',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-soft)]"
        >
          Skip to content
        </a>
        {/* Scroll-reveal content must never stay invisible without JS. */}
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
