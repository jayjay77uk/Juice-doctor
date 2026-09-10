import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={cn('group inline-flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4', className)}
      aria-label="Ask Juice Doctor AI — home"
    >
      <svg viewBox="0 0 152 58" className="h-[2.85rem] w-[7.7rem] overflow-visible sm:w-[8rem]" role="img" aria-label="Ask Juice Doctor AI">
        <defs>
          <linearGradient id="fruitGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe22c" />
            <stop offset=".46" stopColor="#f09b24" />
            <stop offset="1" stopColor="#e33d2e" />
          </linearGradient>
          <linearGradient id="juiceGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e84d2d" />
            <stop offset=".54" stopColor="#ee9a27" />
            <stop offset="1" stopColor="#f3d32d" />
          </linearGradient>
        </defs>
        <g transform="translate(0 1)">
          <path d="M23 10C14 9 7 5 4 1c9-1 16 2 22 8" fill="#45a94d" />
          <path d="M25 10C24 3 29-2 36-2c1 7-2 13-10 18" fill="#45a94d" />
          <path d="M9 25c0-10 8-17 20-17 10 0 17 4 21 11-9 1-15 5-19 12-5 9-9 14-16 14-4-5-6-12-6-20Z" fill="url(#fruitGrad)" />
          <path d="M43 9c8 0 14 4 17 10-8 0-14 3-18 9 1-7 1-13 1-19Z" fill="#ef3d35" />
        </g>
        <text x="24" y="30" fontFamily="Georgia,serif" fontSize="11" fill={inverse ? '#f4f1e8' : '#242424'}>ask</text>
        <text x="18" y="44" fontFamily="Georgia,serif" fontSize="30" fontWeight="600" letterSpacing="-1.5" fill="url(#juiceGrad)">Juice</text>
        <text x="48" y="55" fontFamily="Georgia,serif" fontSize="14" letterSpacing="5" fill={inverse ? '#f7f3e9' : '#272727'}>DOCTOR</text>
        <text x="126" y="43" fontFamily="Georgia,serif" fontSize="16" fill={inverse ? '#f7f3e9' : '#272727'}>AI</text>
      </svg>
    </Link>
  );
}
