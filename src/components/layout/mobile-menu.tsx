'use client';

import * as React from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { primaryNav, routes } from '@/config/routes';
import { Button } from '@/components/ui/button';

/** Focus-trapped mobile navigation drawer (Radix Dialog). */
export function MobileMenu() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="grid size-11 place-items-center rounded-full text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink-900/40 backdrop-blur-sm data-[state=open]:animate-in" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[60] flex w-[86%] max-w-sm flex-col bg-cream-50 shadow-[var(--shadow-soft-lg)] focus:outline-none">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <Dialog.Title className="font-serif text-lg">Menu</Dialog.Title>
            <Dialog.Close
              aria-label="Close menu"
              className="grid size-10 place-items-center rounded-full text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Mobile">
            <ul className="flex flex-col gap-6">
              {primaryNav.map((group) => (
                <li key={group.label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </p>
                  <ul className="flex flex-col">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="block rounded-lg py-2 text-lg text-foreground hover:text-primary"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-3 border-t border-border p-5">
            <Button asChild intent="primary" full>
              <Link href={routes.book.href} onClick={() => setOpen(false)}>
                Book a session
              </Link>
            </Button>
            <Button asChild intent="ghost" full>
              <Link href={routes.login.href} onClick={() => setOpen(false)}>
                Log in
              </Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
