'use client';

import * as React from 'react';
import Link from 'next/link';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { ChevronDown } from 'lucide-react';
import { primaryNav, routes } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { cn } from '@/lib/cn';
import { ph } from '@/content/placeholder';

export function Header() {
  const [condensed, setCondensed] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-all duration-300',
        condensed
          ? 'border-border bg-cream-50/85 shadow-[var(--shadow-crisp)] backdrop-blur-md'
          : 'border-transparent bg-cream-50/60 backdrop-blur',
      )}
    >
      <div className="mx-auto flex h-[var(--header-h)] w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />

        <NavigationMenu.Root className="relative hidden lg:block" delayDuration={80}>
          <NavigationMenu.List className="flex items-center gap-1">
            {primaryNav.map((group, i) => (
              <NavigationMenu.Item key={i}>
                <NavigationMenu.Trigger className="group inline-flex items-center gap-1 rounded-full px-4 py-2 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-surface-muted data-[state=open]:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
                  {group.label}
                  <ChevronDown
                    className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden
                  />
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="absolute left-0 top-full pt-3 data-[motion=from-start]:animate-in">
                  <ul className="grid w-[22rem] gap-1 rounded-2xl border border-border bg-surface p-2 shadow-[var(--shadow-soft)]">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <NavigationMenu.Link asChild>
                          <Link
                            href={item.href}
                            className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
                          >
                            <span className="block text-[0.95rem] font-medium text-foreground">
                              {item.label}
                            </span>
                            {item.description && (
                              <span className="mt-0.5 block text-sm text-muted-foreground">
                                {item.description}
                              </span>
                            )}
                          </Link>
                        </NavigationMenu.Link>
                      </li>
                    ))}
                  </ul>
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            ))}
            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link
                  href={routes.contact.href}
                  className="inline-flex items-center rounded-full px-4 py-2 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-surface-muted"
                >
                  {routes.contact.label}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="flex items-center gap-2">
          <Button asChild intent="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href={routes.login.href}>{ph.cta}</Link>
          </Button>
          <Button asChild intent="primary" size="sm" className="hidden sm:inline-flex">
            <Link href={routes.book.href}>{ph.cta}</Link>
          </Button>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
