import * as React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import { Logo } from './logo';

const nav = [
  ['Home', '/'],
  ['The HERNE Protocol', '/framework'],
  ['Our AI Specialists', '/specialists'],
  ['Success Stories', '/#success-stories'],
  ['Resources', '/resources'],
  ['About', '/about'],
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#070908] text-white">
      <div className="mx-auto max-w-[1055px] px-6 py-5 lg:px-[3.8rem]">
        <div className="grid items-center gap-6 lg:grid-cols-[auto_1fr_auto]">
          <Logo inverse />

          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {nav.map(([label, href]) => (
              <Link key={label} href={href} className="text-[0.58rem] font-medium text-white/68 transition hover:text-white">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-start gap-1.5 lg:justify-end">
            {[Instagram, Youtube, Linkedin, Facebook].map((Icon, index) => (
              <span key={index} className="grid size-7 place-items-center text-white/72" aria-hidden>
                <Icon className="size-3.5" />
              </span>
            ))}
            <span className="grid size-7 place-items-center text-[0.72rem] text-white/72" aria-hidden>X</span>
            <Link href="/register" className="ml-2 inline-flex min-h-8 items-center rounded-full border border-white/45 px-4 text-[0.58rem] font-semibold text-white transition hover:bg-white/[0.06]">
              Join Our Community
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/8 pt-4 text-[0.54rem] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Ask Juice Doctor AI. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
