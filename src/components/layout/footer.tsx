import * as React from 'react';
import Link from 'next/link';
import { footerNav, legalNav } from '@/config/routes';
import { Container } from '@/components/ui/container';
import { Logo } from './logo';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#080808] text-white">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.7fr]">
          <div>
            <Logo inverse />
            <p className="mt-6 max-w-md text-sm leading-7 text-white/50">
              A connected wellbeing platform built around the HERNE Protocol, Makela and a coordinated specialist team.
            </p>
            <Link
              href="/assistant"
              className="brand-gradient mt-7 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#111]"
            >
              Start with Makela
            </Link>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((group) => (
              <div key={group.label}>
                <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#f2c92a]">
                  {group.label}
                </h2>
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-sm text-white/55 transition-colors hover:text-white">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Ask Juice Doctor AI. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-white">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-5 max-w-5xl text-[0.7rem] leading-5 text-white/30">
          Ask Juice Doctor AI supports wellbeing conversations and is not a replacement for emergency or medical care. AI responses are not for emergencies. If you need urgent help, contact your local emergency services.
        </p>
      </Container>
    </footer>
  );
}
