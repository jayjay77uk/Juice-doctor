'use client';

import * as React from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { routes } from '@/config/routes';

const nav = [
  { label: 'HERNE Protocol', href: routes.framework.href },
  { label: 'Specialists', href: routes.specialists.href },
  { label: 'Programmes', href: routes.programmes.href },
  { label: 'Resources', href: routes.resources.href },
  { label: 'About', href: routes.about.href },
  { label: 'Contact', href: routes.contact.href },
];

export function MobileMenu() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="grid size-11 place-items-center rounded-full text-white hover:bg-white/8 focus-visible:outline-white lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[61] flex w-[88%] max-w-sm flex-col border-l border-white/10 bg-[#0b0b0b] text-white shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <Dialog.Title className="font-serif text-xl">Ask Juice Doctor</Dialog.Title>
            <Dialog.Close
              aria-label="Close menu"
              className="grid size-10 place-items-center rounded-full text-white/75 hover:bg-white/8 hover:text-white"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Mobile navigation">
            <ul className="flex flex-col gap-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-lg text-white/82 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3 border-t border-white/10 p-5">
            <Link
              href={routes.assistant.href}
              onClick={() => setOpen(false)}
              className="brand-gradient flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#111]"
            >
              Start your journey
            </Link>
            <Link
              href={routes.login.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
