import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Dumbbell,
  Droplets,
  Heart,
  Leaf,
  MessageCircle,
  MoonStar,
  Play,
  Send,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { frameworkPillars } from '@/content/framework';
import { websiteProfiles } from '@/data/herne/website-profiles';
import type { Testimonial } from '@/types/content';

const press = ['Forbes', 'mindbodygreen', "Women's Health", "Men's Health", 'Good Housekeeping', 'TODAY'];

const pillarVisuals = [
  { icon: Droplets, gradient: 'from-[#092a39] via-[#0e4d67] to-[#07151d]', accent: '#66d9ff' },
  { icon: Leaf, gradient: 'from-[#0a2515] via-[#164f29] to-[#06140b]', accent: '#72db72' },
  { icon: MoonStar, gradient: 'from-[#11172d] via-[#1b2750] to-[#080b17]', accent: '#bca7ff' },
  { icon: Utensils, gradient: 'from-[#35200e] via-[#6b3512] to-[#1e0f08]', accent: '#ff9b4a' },
  { icon: Dumbbell, gradient: 'from-[#38200e] via-[#714020] to-[#1c0e07]', accent: '#ffad63' },
] as const;

const quickPrompts = [
  ['More energy', 'I want help improving my energy'],
  ['Better sleep', 'I want help improving my sleep'],
  ['Healthy weight', 'I want support with healthy weight management'],
  ['Gut support', 'I want help with my gut health'],
] as const;

const heroFeatures = [
  { icon: Leaf, label: 'Personalised AI guidance', tone: 'text-[#45b955]' },
  { icon: BarChart3, label: 'Evidence-led wellbeing', tone: 'text-[#4ac66c]' },
  { icon: Heart, label: 'Connected specialist support', tone: 'text-[#ef6436]' },
  { icon: Sparkles, label: 'One shared care journey', tone: 'text-[#f4ca2d]' },
] as const;

function AssistantCard() {
  return (
    <div className="w-full max-w-[19rem] rounded-[1.4rem] border border-white/20 bg-[#0b0d0c]/95 p-4 shadow-2xl backdrop-blur-xl sm:max-w-[20.5rem]">
      <div className="flex items-center gap-3">
        <span className="relative block size-12 overflow-hidden rounded-full border-2 border-[#43a84e] bg-[#161916]">
          <Image src="/specialists/makela.png" alt="Makela" fill sizes="48px" className="object-cover object-top" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">Hi, I&apos;m Makela</p>
          <p className="text-xs text-white/62">Your AI Wellbeing Concierge</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[0.68rem] text-[#7fe17e]">
            <span className="size-1.5 rounded-full bg-[#34c759]" /> Online now
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#f4f4f3] px-4 py-3 text-sm leading-5 text-[#151515]">
        How can I help you feel your best today?
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {quickPrompts.map(([label, prompt]) => (
          <Link
            key={label}
            href={`/assistant?prompt=${encodeURIComponent(prompt)}`}
            className="rounded-full border border-white/25 px-2 py-2 text-center text-[0.7rem] font-medium text-white/88 transition hover:border-[#f2c92a] hover:text-[#f2c92a]"
          >
            {label}
          </Link>
        ))}
      </div>

      <Link
        href="/assistant"
        className="mt-3 flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] py-1.5 pl-4 pr-1.5 text-xs text-white/45 transition hover:border-white/25"
      >
        <span className="flex-1">Type your question...</span>
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#ee5b2b] via-[#f39b22] to-[#f4d52f] text-black">
          <Send className="size-3.5" />
        </span>
      </Link>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#070908] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_32%,rgba(242,201,42,0.12),transparent_24%),radial-gradient(circle_at_80%_28%,rgba(68,165,74,0.14),transparent_30%)]" aria-hidden />
      <div className="mx-auto grid min-h-[38rem] max-w-[92rem] lg:grid-cols-[0.88fr_1.12fr]">
        <div className="relative z-10 flex flex-col justify-center px-6 py-16 sm:px-10 lg:px-14 xl:px-16">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f2992b]">Better habits. A brighter you.</p>
          <h1 className="mt-4 max-w-[9.5ch] font-serif text-[clamp(3.25rem,6.2vw,6.7rem)] font-semibold leading-[0.88] tracking-[-0.045em] text-white">
            Your Healthier Happier Future <span className="brand-text-gradient">Starts Here.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
            Ask Juice Doctor AI gives you connected wellbeing guidance built around your goals, your context and the right specialist support.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/assistant"
              className="brand-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-bold text-[#111] shadow-[0_12px_35px_rgba(236,146,42,0.24)] transition hover:scale-[1.01]"
            >
              Ask Juice Doctor Now <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#herne"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 px-7 text-sm font-semibold text-white transition hover:border-white/70 hover:bg-white/[0.05]"
            >
              <Play className="size-4" /> Watch how it works
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-4 text-[0.7rem] text-white/68 sm:grid-cols-4">
            {heroFeatures.map(({ icon: Icon, label, tone }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                  <Icon className={`size-4 ${tone}`} />
                </span>
                <span className="leading-4">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[35rem] overflow-hidden lg:min-h-full">
          <Image
            src="/specialists/hero.png"
            alt="Ask Juice Doctor wellbeing"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 56vw"
            className="object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070908] via-[#070908]/15 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070908]/55 via-transparent to-[#070908]/10" />
          <p className="absolute right-7 top-8 hidden max-w-[11rem] rotate-[-4deg] font-serif text-3xl italic leading-tight text-[#f6e4ae] xl:block">
            More energy. A brighter you.
          </p>
          <div className="absolute bottom-7 right-5 w-[min(92%,21rem)] sm:bottom-8 sm:right-8">
            <AssistantCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function PressStrip() {
  return (
    <section className="border-b border-white/10 bg-[#090b0a] text-white">
      <div className="mx-auto flex max-w-[92rem] flex-col items-center gap-5 px-6 py-6 lg:flex-row lg:gap-10 lg:px-14">
        <p className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.26em] text-white/45">Featured in</p>
        <div className="grid w-full grid-cols-2 items-center gap-x-8 gap-y-4 text-center sm:grid-cols-3 lg:grid-cols-6">
          {press.map((item, i) => (
            <span key={item} className={`text-white/78 ${i === 1 ? 'text-sm font-semibold' : 'font-serif text-lg font-semibold'}`}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function HerneSection() {
  return (
    <section id="herne" className="border-b border-white/10 bg-[#080a09] py-14 text-white sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-[92rem] gap-10 px-6 sm:px-10 lg:grid-cols-[0.72fr_1.7fr] lg:px-14">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ef8d2b]">The HERNE Protocol</p>
          <h2 className="mt-3 max-w-[8ch] font-serif text-5xl font-semibold leading-[0.93] tracking-[-0.035em] sm:text-6xl">
            Five Pillars. A Healthier You.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/62 sm:text-base">
            The HERNE Protocol brings Hydration, Elimination, Rest, Nutrition and Exercise into one connected framework for your wellbeing journey.
          </p>
          <Link href="/framework" className="brand-gradient mt-7 inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-bold text-[#111]">
            Explore the HERNE Protocol <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {frameworkPillars.map((pillar, index) => {
            const visual = pillarVisuals[index] ?? pillarVisuals[0];
            const Icon = visual.icon;
            return (
              <Link
                key={pillar.key}
                href={`/framework#${pillar.key}`}
                className={`group relative min-h-[20rem] overflow-hidden rounded-[1.15rem] border border-white/15 bg-gradient-to-b ${visual.gradient} p-5 transition duration-300 hover:-translate-y-1 hover:border-white/30`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.13),transparent_28%)]" />
                <div className="relative flex h-full flex-col items-center justify-end text-center">
                  <span className="mb-auto mt-4 grid size-20 place-items-center rounded-full border border-white/10 bg-black/15 backdrop-blur">
                    <Icon className="size-9" style={{ color: visual.accent }} />
                  </span>
                  <span className="font-serif text-4xl" style={{ color: visual.accent }}>{pillar.letter}</span>
                  <h3 className="mt-1 font-serif text-xl text-white">{pillar.name}</h3>
                  <p className="mt-3 text-xs leading-5 text-white/60">{pillar.tagline}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SpecialistSection() {
  const profiles = websiteProfiles();
  return (
    <section className="border-b border-white/10 bg-[#090b0a] py-14 text-white sm:py-16">
      <div className="mx-auto grid max-w-[92rem] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[0.7fr_1.8fr] lg:px-14">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f0b62a]">Meet your AI wellbeing team</p>
          <h2 className="mt-3 max-w-[8ch] font-serif text-5xl font-semibold leading-[0.94] tracking-[-0.03em] sm:text-6xl">
            Real Expertise. Always by Your Side.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/62 sm:text-base">
            Led by Makela, your concierge, with eight specialist roles that work from shared context so your support stays connected.
          </p>
          <Link href="/specialists" className="brand-gradient mt-7 inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-bold text-[#111]">
            Meet all our specialists <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 xl:grid-cols-8">
          {profiles.map((profile, index) => (
            <Link key={profile.slug} href={`/specialists/${profile.slug}`} className="group text-center">
              <span className={`relative mx-auto grid ${index === 0 ? 'size-24' : 'size-20'} place-items-center overflow-hidden rounded-full border-2 border-[#6ba36d]/70 bg-[#151b17] shadow-[0_0_0_4px_rgba(242,201,42,0.06)] transition group-hover:border-[#f2c92a]`}>
                {profile.portrait ? (
                  <Image src={profile.portrait} alt={profile.name} fill sizes="96px" className="object-cover object-top" />
                ) : (
                  <span className="font-serif text-3xl text-[#f0c93b]">{profile.name.charAt(0)}</span>
                )}
                {index === 0 && <span className="absolute bottom-1 right-1 size-3.5 rounded-full border-2 border-[#0a0c0b] bg-[#36d05d]" />}
              </span>
              <span className="mt-3 block text-sm font-semibold text-white">{profile.name}</span>
              <span className="mx-auto mt-1 block max-w-[8rem] text-[0.65rem] leading-4 text-white/48">{profile.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultsBand() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#111713] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(242,201,42,0.13),transparent_35%),linear-gradient(90deg,rgba(8,13,9,0.98),rgba(21,36,24,0.90),rgba(9,12,10,0.98))]" />
      <div className="relative mx-auto grid max-w-[92rem] gap-7 px-6 py-8 sm:px-10 md:grid-cols-[0.8fr_1fr_1fr_1fr_1.25fr] md:items-center lg:px-14">
        <div className="text-sm font-bold uppercase tracking-[0.18em] text-white/90">Real people.<br />Real results.</div>
        {[
          ['92%', 'reported increased daily energy'],
          ['87%', 'reported improved digestion'],
          ['3x', 'increase in mental clarity'],
        ].map(([value, label]) => (
          <div key={value} className="border-white/15 md:border-l md:pl-7">
            <p className="font-serif text-5xl font-semibold text-[#f5d54c]">{value}</p>
            <p className="mt-1 max-w-[12rem] text-xs leading-5 text-white/65">{label}</p>
          </div>
        ))}
        <blockquote className="border-white/15 font-serif text-xl italic leading-7 text-white/74 md:border-l md:pl-7">
          “Small changes, consistently applied, create extraordinary health.”
        </blockquote>
      </div>
    </section>
  );
}

function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;
  return (
    <section id="stories" className="border-b border-white/10 bg-[#080a09] py-14 text-white sm:py-16">
      <div className="mx-auto grid max-w-[92rem] gap-9 px-6 sm:px-10 lg:grid-cols-[0.62fr_1.8fr] lg:px-14">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ef7531]">Success stories</p>
          <h2 className="mt-3 font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.03em] sm:text-6xl">Real People. Brighter Lives.</h2>
          <p className="mt-5 text-sm leading-6 text-white/58">Experiences shared by people using Ask Juice Doctor as part of their wellbeing journey.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.slice(0, 3).map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-start gap-4">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-[#1e2c20] to-[#392315] font-serif text-xl text-[#f2c92a]">
                  {item.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm leading-6 text-white/78">“{item.quote}”</p>
                  <div className="mt-3 text-xs tracking-[0.16em] text-[#f2c92a]">★★★★★</div>
                  <p className="mt-2 text-xs font-semibold text-white">{item.name}</p>
                  <p className="text-[0.68rem] text-white/45">{item.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative min-h-[22rem] overflow-hidden bg-[#12150f] text-white">
      <Image src="/specialists/hero.png" alt="A brighter wellbeing journey" fill sizes="100vw" className="object-cover object-center opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d0b]/95 via-[#0b0d0b]/72 to-[#0b0d0b]/35" />
      <div className="relative mx-auto flex min-h-[22rem] max-w-[92rem] items-center px-6 py-12 sm:px-10 lg:px-14">
        <div className="max-w-3xl">
          <h2 className="font-serif text-5xl font-semibold leading-[0.92] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
            A <span className="text-[#f3cd3b]">Healthier, Happier You</span> Is Closer Than You Think.
          </h2>
          <p className="mt-5 text-sm text-white/70 sm:text-base">Ask your questions. Get connected guidance. Take the first step today.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/assistant" className="brand-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-bold text-[#111]">
              Ask Juice Doctor Now <ArrowRight className="size-4" />
            </Link>
            <Link href="/specialists" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 px-7 text-sm font-semibold text-white">
              <MessageCircle className="size-4" /> Meet the team
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeReference({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <div className="bg-[#080a09]">
      <HeroSection />
      <PressStrip />
      <HerneSection />
      <SpecialistSection />
      <ResultsBand />
      <TestimonialsSection testimonials={testimonials} />
      <FinalCta />
    </div>
  );
}
