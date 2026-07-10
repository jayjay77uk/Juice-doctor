import * as React from 'react';
import Image from 'next/image';
import type { BrandTone, ImageRef } from '@/types/content';
import { cn } from '@/lib/cn';

/**
 * Renders an ImageRef. In the prototype (`src` omitted) it draws a brand-graded
 * placeholder carrying the intended warm/teal treatment, so reviewers judge the
 * real aesthetic rather than grey boxes. In production it renders `next/image`.
 */

const toneGradient: Record<BrandTone, string> = {
  teal: 'from-teal-800 via-teal-600 to-teal-400',
  green: 'from-green-700 via-green-600 to-green-300',
  amber: 'from-amber-700 via-amber-500 to-amber-200',
  sage: 'from-teal-700 via-sage-300 to-cream-200',
  ink: 'from-ink-900 via-ink-700 to-teal-700',
};

export interface MediaProps {
  image: ImageRef;
  className?: string;
  /** Applies a legibility overlay for text placed on top. */
  overlay?: boolean;
  rounded?: boolean;
  priority?: boolean;
  sizes?: string;
  children?: React.ReactNode;
}

export function Media({
  image,
  className,
  overlay = false,
  rounded = true,
  priority = false,
  sizes = '100vw',
  children,
}: MediaProps) {
  const ratio = image.ratio ?? '3/2';
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden',
        rounded && 'rounded-xl',
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      {image.src ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={image.alt}
          className={cn(
            'absolute inset-0 bg-gradient-to-br bg-grain',
            toneGradient[image.tone ?? 'teal'],
          )}
        />
      )}
      {overlay && <div className="overlay-hero absolute inset-0" aria-hidden />}
      {children && <div className="relative z-10 flex h-full flex-col">{children}</div>}
    </div>
  );
}
