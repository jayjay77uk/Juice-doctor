import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MessageCircle, Play, Sparkles } from 'lucide-react';
import { routes } from '@/config/routes';
import { Container } from '@/components/ui/container';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#080808] text-white">
      <div className="brand-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-25" aria-hidden />

      <Container className="relative grid min-h-[43rem] items-center gap-10 py-14 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:py-20">
        <div className="z-10 max-w-3xl">
          <div className="reveal inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#f2c92a]">
            <Sparkles className="size-3.5" />
            Ask Juice Doctor AI
          </div>

          <h1 className="reveal reveal-2 mt-7 max-w-[11ch] text-display text-white">
            Your health.
            <span className="block brand-text-gradient">One intelligent team.</span>
          </h1>

          <p className="reveal reveal-3 mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
            Start with Makela, your wellbeing concierge. She listens, understands what you need and connects you with the right specialist while your care stays joined up.
          </p>

          <div className="reveal reveal-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={routes.assistant.href}
              className="brand-gradient inline-flex min-h-13 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold text-[#111] shadow-[0_16px_42px_rgba(224,71,40,0.26)] transition-transform hover:-translate-y-0.5"
            >
              Ask Makela now <ArrowRight className="size-4" />
            </Link>
            <Link
              href={routes.specialists.href}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 text-base font-medium text-white transition-colors hover:bg-white/[0.09]"
            >
              <Play className="size-4" /> Meet the team
            </Link>
          </div>

          <dl className="reveal reveal-4 mt-10 grid max-w-2xl grid-cols-3 divide-x divide-white/12 border-y border-white/10 py-5">
            <div className="pr-4">
              <dt className="font-serif text-3xl text-[#f2c92a]">5</dt>
              <dd className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">HERNE pillars</dd>
            </div>
            <div className="px-4 sm:px-6">
              <dt className="font-serif text-3xl text-[#44a54a]">8</dt>
              <dd className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">Specialists</dd>
            </div>
            <div className="pl-4 sm:pl-6">
              <dt className="font-serif text-3xl text-[#ec922a]">1</dt>
              <dd className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">Shared journey</dd>
            </div>
          </dl>
        </div>

        <div className="reveal reveal-2 relative mx-auto w-full max-w-[35rem] lg:ml-auto">
          <div className="absolute -inset-5 rounded-[2.75rem] bg-gradient-to-br from-[#e04728]/20 via-transparent to-[#44a54a]/16 blur-2xl" aria-hidden />
          <div className="relative min-h-[35rem] overflow-hidden rounded-[2.4rem] border border-white/12 bg-[#141414] shadow-[0_35px_100px_rgba(0,0,0,0.5)] sm:min-h-[39rem]">
            <Image
              src="/specialists/makela.png"
              alt="Makela, Ask Juice Doctor wellbeing concierge"
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 44vw"
              className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f2c92a]">Your first point of contact</p>
              <p className="mt-2 font-serif text-4xl text-white">Meet Makela</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/65">Talk naturally. Makela helps you find the right next step and the right member of your wellbeing team.</p>
            </div>
          </div>

          <div className="absolute -left-3 top-9 hidden w-[17rem] rounded-[1.6rem] border border-white/12 bg-[#111]/95 p-4 shadow-2xl backdrop-blur sm:block lg:-left-16">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-[#44a54a]/15 text-[#76c77b]"><MessageCircle className="size-4" /></span>
              <div>
                <p className="text-sm font-semibold text-white">Hi, I’m Makela</p>
                <p className="text-xs text-white/45">Your wellbeing concierge</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-5 text-[#222]">What would you like support with today?</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Energy', 'Sleep', 'Nutrition'].map((item) => (
                <span key={item} className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/64">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
