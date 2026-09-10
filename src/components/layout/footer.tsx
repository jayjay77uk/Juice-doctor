import * as React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import { Logo } from './logo';

const nav = [
  ['Home', '/'],
  ['The HERNE Protocol', '/framework'],
  ['Our AI Specialists', '/specialists'],
  ['Success Stories', '/#stories'],
  ['Resources', '/resources'],
  ['About', '/about'],
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#070908] text-white">
      <div className="mx-auto max-w-[92rem] px-6 py-8 sm:px-10 lg:px-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <Logo inverse />

          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {nav.map(([label, href]) => (
              <Link key={label} href={href} className="text-[0.72rem] font-medium text-white/58 transition hover:text-white">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-2.5">
            {[Instagram, Youtube, Linkedin, Facebook].map((Icon, index) => (
              <span key={index} className="grid size-8 place-items-center rounded-full text-white/68" aria-hidden>
                <Icon className="size-3.5" />
              </span>
            ))}
            <Link href="/register" className="ml-1 inline-flex min-h-9 items-center rounded-full border border-white/35 px-4 text-[0.7rem] font-semibold text-white transition hover:border-white/70 hover:bg-white/[0.05]">
              Join Our Community
            </Link>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-4 border-t border-white/10 pt-6 text-[0.68rem] text-white/38 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Ask Juice Doctor AI. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>

        <p className="mt-4 max-w-5xl text-[0.64rem] leading-5 text-white/28">
          Ask Juice Doctor AI supports wellbeing conversations and is not a replacement for emergency or medical care. If you need urgent help, contact your local emergency services.
        </p>
      </div>
    </footer>
  );
}
