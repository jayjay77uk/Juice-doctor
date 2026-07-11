import * as React from 'react';
import Link from 'next/link';
import { Instagram, Youtube, Linkedin, Facebook } from 'lucide-react';
import { footerNav, legalNav } from '@/config/routes';
import { site } from '@/content/site';
import { Container } from '@/components/ui/container';
import { Logo } from './logo';
import { NewsletterForm } from '@/components/sections/newsletter-form';

const socialIcons = {
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  facebook: Facebook,
  spotify: Youtube, // lucide has no Spotify brand mark; placeholder in prototype
} as const;

export function Footer() {
  const year = 2026; // prototype: fixed to keep builds deterministic

  return (
    <footer className="bg-teal-800 text-cream-100">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div className="flex flex-col gap-6">
            <Logo inverse />
            <p className="measure text-cream-200">{site.shortDescription}</p>
            <div>
              <p className="mb-2 text-sm font-medium text-cream-100">
                Subscribe to our newsletter
              </p>
              <NewsletterForm inverse />
            </div>
            <div className="flex items-center gap-2">
              {site.socials.map((social, i) => {
                const Icon = socialIcons[social.icon];
                return (
                  <a
                    key={i}
                    href={social.href}
                    aria-label={social.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-10 place-items-center rounded-full bg-white/8 text-cream-100 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream-50"
                  >
                    <Icon className="size-4.5" />
                  </a>
                );
              })}
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((group, i) => (
              <div key={i}>
                <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-cream-200">
                  {group.label}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-cream-100/90 transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/12 pt-7 text-sm text-cream-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. Founded by {site.founder.name}, {site.founder.knownAs}.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-xs text-cream-200/70">
          Prototype environment for demonstration only. Not medical advice. No live services,
          payments, or patient data are connected.
        </p>
      </Container>
    </footer>
  );
}
