import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

/**
 * Merge class names with Tailwind-aware conflict resolution.
 * `cn('px-2', condition && 'px-4')` → the later, truthy class wins.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
