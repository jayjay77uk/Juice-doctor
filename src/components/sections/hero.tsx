import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { routes } from '@/config/routes';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Media } from '@/components/ui/media';

export function Hero() {
  return (
    <section className="bg-black pb-5 pt-0 text-white">
      <Container className="px-0 sm:px-5 lg:px-8">
        <Media
          image={{ alt: 'A vivid blue editorial portrait representing a new health chapter', tone: 'teal', ratio: '16/9' }}
          overlay
          rounded
          priority
          sizes="(max-width: 1024px) 100vw, 90vw"
          className="min-h-[34rem] sm:min-h-[42rem] lg:min-h-[calc(100vh-7rem)]"
        >
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Ask Juice Doctor</span>
            <span className="hidden items-center gap-2 text-xs text-white/80 sm:flex"><Search className="size-4" /> Explore health, your way</span>
          </div>
          <div className="mt-auto grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_24rem] lg:items-end lg:p-14">
            <div className="max-w-4xl">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Your health, with direction</p>
              <h1 className="max-w-4xl font-sans text-[clamp(3.5rem,8vw,7.4rem)] font-semibold leading-[0.9] tracking-[-0.08em] text-white">
                Your next chapter<br />starts here.
              </h1>
              <Button asChild size="lg" className="mt-8 rounded-full bg-white px-8 text-black hover:bg-blue-100">
                <Link href={routes.assessment.href}>Start your assessment <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
            <div className="rounded-2xl bg-black p-6 text-white sm:p-7">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-blue-300">AI Juice Doctor</p>
              <p className="mt-10 font-serif text-3xl leading-none sm:text-4xl">Personal support.<br />Whenever you need it.</p>
              <Link href={routes.assistant.href} className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white hover:text-blue-300">Meet your guide <ArrowRight className="size-4" /></Link>
            </div>
          </div>
        </Media>
      </Container>
    </section>
  );
}
