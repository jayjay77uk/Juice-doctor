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
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import { websiteProfiles } from '@/data/herne/website-profiles';
import type { Testimonial } from '@/types/content';

type HomeReferenceProps = {
  testimonials: Testimonial[];
};

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1775542188317-0f93e997db7e?auto=format&fit=crop&fm=jpg&q=85&w=1800';

const HERNE = [
  {
    key: 'pillar-one',
    letter: 'H',
    name: 'Hydration',
    line1: 'Fuel your body.',
    line2: 'Ignite your energy.',
    icon: Droplets,
    accent: '#6ee7ff',
    border: '#147da1',
    background:
      'radial-gradient(circle at 50% 20%, rgba(80,210,255,.62), transparent 13%), radial-gradient(ellipse at 50% 36%, rgba(33,137,183,.55), transparent 32%), linear-gradient(180deg,#06314a 0%,#051b28 52%,#061217 100%)',
  },
  {
    key: 'pillar-two',
    letter: 'E',
    name: 'Elimination',
    line1: 'Cleanse. Reset.',
    line2: 'Feel lighter.',
    icon: Leaf,
    accent: '#8be47e',
    border: '#357d3c',
    background:
      'radial-gradient(ellipse at 35% 20%, rgba(108,194,69,.65), transparent 25%), radial-gradient(ellipse at 65% 32%, rgba(37,118,55,.75), transparent 35%), linear-gradient(160deg,#174b22 0%,#0a2912 50%,#07130a 100%)',
  },
  {
    key: 'pillar-three',
    letter: 'R',
    name: 'Rest',
    line1: 'Deeper sleep.',
    line2: 'A brighter you.',
    icon: MoonStar,
    accent: '#bba7ff',
    border: '#47538d',
    background:
      'radial-gradient(circle at 52% 22%, rgba(245,238,210,.95) 0 10%, rgba(191,192,202,.35) 11%, transparent 22%), radial-gradient(circle at 15% 28%,rgba(255,255,255,.42) 0 1px,transparent 2px), radial-gradient(circle at 82% 16%,rgba(255,255,255,.35) 0 1px,transparent 2px), linear-gradient(180deg,#132044 0%,#11172f 56%,#0b1020 100%)',
  },
  {
    key: 'pillar-four',
    letter: 'N',
    name: 'Nutrition',
    line1: 'Real food.',
    line2: 'Real vitality.',
    icon: UtensilsCrossed,
    accent: '#ffad63',
    border: '#9a5c22',
    background:
      'radial-gradient(circle at 39% 22%,#ffb72d 0 13%,transparent 14%), radial-gradient(circle at 59% 23%,#ef7a25 0 15%,transparent 16%), radial-gradient(ellipse at 51% 16%,#417c2d 0 11%,transparent 12%), linear-gradient(180deg,#4b2b0d 0%,#30180b 54%,#1a0e08 100%)',
  },
  {
    key: 'pillar-five',
    letter: 'E',
    name: 'Exercise',
    line1: 'Move more.',
    line2: 'Live better.',
    icon: Dumbbell,
    accent: '#ff9b5c',
    border: '#aa5423',
    background:
      'radial-gradient(circle at 58% 18%,rgba(255,188,83,.85),transparent 14%), linear-gradient(180deg,#a65c29 0%,#543019 37%,#25150d 64%,#130c08 100%)',
  },
] as const;

const quickPrompts = [
  ['More energy', 'I want help improving my energy'],
  ['Better sleep', 'I want help improving my sleep'],
  ['Healthy weight', 'I want support with healthy weight management'],
  ['Detox support', 'I want support with my wellbeing and detox habits'],
] as const;

function GradientButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#ff692f_0%,#ffab28_48%,#ffe532_100%)] px-7 text-sm font-bold text-black shadow-[0_12px_35px_rgba(240,128,38,.24)] transition hover:-translate-y-0.5 hover:brightness-105"
    >
      {children}
    </Link>
  );
}

function AssistantCard() {
  return (
    <div className="w-full rounded-[1.35rem] border border-white/20 bg-[#101312]/95 p-4 shadow-[0_22px_55px_rgba(0,0,0,.52)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="relative block size-[3.25rem] shrink-0 overflow-hidden rounded-full border-2 border-[#54c45e] bg-[#171a18]">
          <Image src="/specialists/makela.png" alt="Makela" fill sizes="52px" className="object-cover object-top" />
        </span>
        <div className="min-w-0">
          <p className="text-[1.05rem] font-bold leading-tight text-white">Hi, I&apos;m Makela</p>
          <p className="mt-0.5 text-[0.72rem] text-white/72">Your AI Wellness Concierge</p>
          <p className="mt-1 flex items-center gap-1.5 text-[0.62rem] text-white/58">
            <span className="size-1.5 rounded-full bg-[#26d55b]" /> Online now
          </p>
        </div>
      </div>

      <div className="relative mt-4 rounded-[1.1rem] bg-[#f3f3f5] px-4 py-3 text-[0.78rem] font-medium leading-5 text-[#151515]">
        How can I help you feel your best today?
        <span className="absolute -bottom-2 left-4 size-4 rotate-45 bg-[#f3f3f5]" aria-hidden />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {quickPrompts.map(([label, prompt]) => (
          <Link
            key={label}
            href={`/assistant?prompt=${encodeURIComponent(prompt)}`}
            className="rounded-full border border-white/28 px-2 py-2 text-center text-[0.65rem] font-medium text-white/86 transition hover:border-[#f5c62b] hover:text-[#f5c62b]"
          >
            {label}
          </Link>
        ))}
      </div>

      <form action="/assistant" method="GET" className="mt-3 flex items-center rounded-full border border-white/12 bg-white/[0.07] p-1 pl-4">
        <input
          name="prompt"
          aria-label="Ask Makela a question"
          placeholder="Type your question..."
          className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/42"
        />
        <button
          type="submit"
          aria-label="Send question"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#ff7434,#ffb323,#ffe333)] text-black transition hover:scale-105"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

function Hero() {
  const trust = [
    { icon: Leaf, label: <>Personalised<br />AI Guidance</>, tint: 'text-[#29d25c]' },
    { icon: BarChart3, label: <>Evidence-Based<br />Wellness</>, tint: 'text-[#35d76a]' },
    { icon: Heart, label: <>Real Support.<br />Real Progress.</>, tint: 'text-[#f06438]' },
    { icon: Sparkles, label: <>A Healthier<br />Happier You</>, tint: 'text-[#f6c72c]' },
  ];

  return (
    <section className="relative overflow-hidden border-b border-white/15 bg-[#070908] text-white">
      <div className="mx-auto grid min-h-[40rem] max-w-[1055px] lg:grid-cols-[45.5%_54.5%]">
        <div className="relative z-20 flex flex-col justify-center bg-[linear-gradient(90deg,#070908_78%,rgba(7,9,8,.94)_90%,rgba(7,9,8,.30))] px-6 py-12 sm:px-10 lg:-mr-20 lg:px-[3.8rem] lg:py-9">
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.23em] text-[#f29a2b]">Better habits. A brighter you.</p>
          <h1 className="mt-3 max-w-[8.25ch] font-serif text-[clamp(3.25rem,6vw,4.85rem)] font-semibold leading-[0.88] tracking-[-0.045em] text-white">
            Your Healthier Happier Future <span className="brand-text-gradient">Starts Here.</span>
          </h1>
          <p className="mt-5 max-w-[29rem] text-[0.95rem] leading-[1.42] text-white/78">
            Ask Juice Doctor AI gives you expert guidance, personalized to you. Real answers. Real change. A healthier, more energized life — within reach.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <GradientButton href="/assistant">Ask Juice Doctor Now <ArrowRight className="size-4" /></GradientButton>
            <Link
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/50 bg-black/30 px-6 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            >
              <span className="grid size-5 place-items-center rounded-full border border-white/65"><Play className="size-2.5 fill-current" /></span>
              Watch How It Works
            </Link>
          </div>

          <div className="mt-7 grid max-w-[31rem] grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
            {trust.map(({ icon: Icon, label, tint }) => (
              <div key={tint} className="flex items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#101512]">
                  <Icon className={`size-4 ${tint}`} />
                </span>
                <span className="text-[0.57rem] leading-[1.25] text-white/75">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative min-h-[34rem] bg-cover bg-center lg:min-h-full"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,9,8,.50),transparent_25%),linear-gradient(0deg,rgba(7,9,8,.18),transparent_35%)]" />
          <p className="absolute right-5 top-10 hidden w-[9.5rem] rotate-[-7deg] text-center font-serif text-[2rem] italic leading-[1.06] text-[#fae9b6] xl:block">
            More Energy<br />A Brighter<br />You ♡
          </p>
          <div className="absolute bottom-7 right-4 w-[18.2rem] sm:right-6 lg:right-4 xl:w-[19.2rem]">
            <AssistantCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function PressStrip() {
  const press = [
    ['Forbes', 'font-serif text-[1.35rem] font-semibold'],
    ['mindbodygreen', 'text-[0.72rem] font-semibold'],
    ["Women'sHealth", 'font-serif text-[1.05rem] font-semibold'],
    ["Men'sHealth", 'font-serif text-[1.05rem] font-semibold'],
    ['GoodHousekeeping', 'font-serif text-[0.94rem] font-semibold'],
    ['TODAY', 'text-[0.86rem] font-black'],
  ];
  return (
    <section className="border-b border-white/15 bg-[#0a0c0b] text-white">
      <div className="mx-auto flex max-w-[1055px] items-center gap-7 px-6 py-5 lg:px-[3.8rem]">
        <p className="hidden shrink-0 text-[0.57rem] font-bold uppercase tracking-[0.28em] text-white/50 sm:block">Featured in</p>
        <div className="grid flex-1 grid-cols-3 items-center gap-4 text-center sm:grid-cols-6">
          {press.map(([name, cls]) => <span key={name} className={`text-white/84 ${cls}`}>{name}</span>)}
        </div>
        <p className="hidden w-24 text-center text-[0.5rem] uppercase tracking-[0.2em] text-white/50 xl:block">A healthier<br />world is possible</p>
      </div>
    </section>
  );
}

function HerneCard({ item }: { item: (typeof HERNE)[number] }) {
  const Icon = item.icon;
  return (
    <Link
      href={`/framework#${item.key}`}
      className="group relative flex min-h-[13.3rem] overflow-hidden rounded-[0.85rem] border bg-[#0d1512] px-3 pb-4 pt-3 text-center transition duration-300 hover:-translate-y-1 hover:brightness-110"
      style={{ borderColor: item.border, backgroundImage: item.background }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_26%,rgba(2,7,7,.08)_40%,rgba(3,7,8,.72)_69%,rgba(2,5,6,.96)_100%)]" />
      <div className="relative flex w-full flex-col items-center justify-end">
        <Icon className="mb-auto mt-2 size-9 opacity-65" style={{ color: item.accent }} />
        <span className="font-serif text-[2rem] leading-none" style={{ color: item.accent }}>{item.letter}</span>
        <h3 className="mt-0.5 font-serif text-[1.02rem] leading-tight" style={{ color: item.accent }}>{item.name}</h3>
        <p className="mt-2 text-[0.62rem] leading-[1.35] text-white/76">{item.line1}<br />{item.line2}</p>
      </div>
    </Link>
  );
}

function HerneSection() {
  return (
    <section id="how-it-works" className="border-b border-white/15 bg-[#090b0a] py-8 text-white sm:py-10">
      <div className="mx-auto grid max-w-[1055px] gap-8 px-6 lg:grid-cols-[25.5%_74.5%] lg:px-[3.2rem]">
        <div className="self-center lg:pr-4">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-[#f08029]">The HERNE Protocol</p>
          <h2 className="mt-2 font-serif text-[2.55rem] font-semibold leading-[0.94] tracking-[-0.035em] sm:text-[3rem]">Five Pillars.<br />A Healthier You.</h2>
          <p className="mt-4 max-w-xs text-[0.82rem] leading-[1.5] text-white/72">The HERNE Protocol is our proven framework for total wellbeing — designed to help you feel better, live longer, and become the best version of you.</p>
          <GradientButton href="/framework">Explore the HERNE Protocol <ArrowRight className="size-4" /></GradientButton>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {HERNE.map((item) => <HerneCard key={item.key} item={item} />)}
        </div>
      </div>
    </section>
  );
}

function SpecialistsSection() {
  const profiles = websiteProfiles();
  return (
    <section className="relative overflow-hidden border-b border-white/15 bg-[#090b0a] py-8 text-white sm:py-10">
      <div className="pointer-events-none absolute right-8 top-2 hidden rotate-[-5deg] font-serif text-[1.6rem] italic text-[#dca72b]/85 xl:block">A Healthier<br />Happier You ♡</div>
      <div className="mx-auto grid max-w-[1055px] items-center gap-7 px-6 lg:grid-cols-[25.5%_74.5%] lg:px-[3.2rem]">
        <div className="lg:pr-3">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-[#efb52e]">Meet your AI wellness team</p>
          <h2 className="mt-2 font-serif text-[2.45rem] font-semibold leading-[0.94] tracking-[-0.03em]">Real Expertise.<br />Always by Your Side.</h2>
          <p className="mt-4 text-[0.78rem] leading-[1.48] text-white/70">Led by Makela, your AI concierge, with a team of 8 specialized AI experts — here to answer your questions, create personalized plans, and support you every step of the way.</p>
          <div className="mt-5"><GradientButton href="/specialists">Meet All Our Specialists <ArrowRight className="size-4" /></GradientButton></div>
        </div>

        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-8">
          {profiles.map((profile, index) => (
            <Link key={profile.slug} href={`/specialists/${profile.slug}`} className="group text-center">
              <span className={`relative mx-auto grid ${index === 0 ? 'size-[5.3rem] lg:size-[5.8rem]' : 'size-[4.35rem] lg:size-[4.6rem]'} place-items-center overflow-hidden rounded-full border-2 border-[#6a9871] bg-[radial-gradient(circle_at_45%_35%,#493f31,#181d19_70%)] shadow-[0_0_0_3px_rgba(236,180,46,.08)] transition group-hover:border-[#f1c32f]`}>
                {profile.portrait ? (
                  <Image src={profile.portrait} alt={profile.name} fill sizes="96px" className="object-cover object-top" />
                ) : (
                  <span className="font-serif text-2xl font-semibold text-[#f1c436]">{profile.name.slice(0, 1)}</span>
                )}
                {index === 0 && <span className="absolute bottom-1 right-1 size-3 rounded-full border-2 border-[#090b0a] bg-[#27d55b]" />}
              </span>
              <span className="mt-2 block text-[0.72rem] font-semibold text-white">{profile.name}</span>
              {index === 0 && <span className="mt-0.5 block text-[0.56rem] text-[#48cf65]">AI Concierge</span>}
              <span className="mx-auto mt-1 block max-w-[6.5rem] text-[0.52rem] leading-[1.28] text-white/52">{profile.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultsBand() {
  return (
    <section
      className="relative overflow-hidden border-b border-white/15 bg-[#151b15] text-white"
      style={{ backgroundImage: 'radial-gradient(circle at 45% 0%,rgba(229,172,62,.22),transparent 24%),linear-gradient(90deg,rgba(7,13,9,.98),rgba(26,38,25,.90),rgba(8,12,9,.98))' }}
    >
      <div className="absolute inset-x-0 bottom-0 h-16 opacity-40 [clip-path:polygon(0_65%,8%_42%,18%_55%,28%_30%,39%_48%,50%_20%,62%_43%,73%_24%,85%_51%,100%_28%,100%_100%,0_100%)] bg-[#2b3729]" />
      <div className="relative mx-auto grid max-w-[1055px] items-center gap-6 px-6 py-6 sm:grid-cols-4 lg:grid-cols-[1.15fr_1fr_1fr_1fr_1.35fr] lg:px-[3.8rem]">
        <p className="text-[0.72rem] font-bold uppercase leading-[1.65] tracking-[0.18em]">Real People.<br />Real Results.</p>
        <div className="text-center"><strong className="font-serif text-[2.3rem] text-[#f2ca35]">92%</strong><p className="mt-1 text-[0.68rem] leading-4 text-white/82">Feel more energy<br />within 30 days</p></div>
        <div className="border-white/20 text-center sm:border-l"><strong className="font-serif text-[2.3rem] text-[#f2ca35]">87%</strong><p className="mt-1 text-[0.68rem] leading-4 text-white/82">Report better sleep<br />and mood</p></div>
        <div className="border-white/20 text-center sm:border-l"><strong className="font-serif text-[2.3rem] text-[#f2ca35]">3x</strong><p className="mt-1 text-[0.68rem] leading-4 text-white/82">More likely to stick to<br />healthy habits</p></div>
        <div className="hidden text-center font-serif text-[1.12rem] italic leading-[1.15] text-[#f4e5c1] lg:block">“Small changes<br />create extraordinary lives.”<span className="mt-2 block font-sans text-[0.48rem] not-italic tracking-[0.22em] text-white/55">ASK JUICE DOCTOR AI</span></div>
      </div>
    </section>
  );
}

function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section id="success-stories" className="border-b border-white/15 bg-[#090b0a] py-8 text-white sm:py-10">
      <div className="mx-auto grid max-w-[1055px] gap-7 px-6 lg:grid-cols-[22%_78%] lg:px-[3.2rem]">
        <div>
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-[#ef762c]">Success stories</p>
          <h2 className="mt-2 font-serif text-[2.35rem] font-semibold leading-[0.95]">Real People.<br />Brighter Lives.</h2>
          <p className="mt-4 text-[0.76rem] leading-[1.5] text-white/67">Stories and experiences shared by people using Ask Juice Doctor as part of their wellbeing journey.</p>
        </div>
        {testimonials.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {testimonials.slice(0, 3).map((item) => (
              <article key={item.id} className="flex min-h-[8.7rem] gap-3 rounded-xl border border-white/10 bg-[#181b1a] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
                <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-[#bd8952] bg-[#2c332e] font-serif text-xl text-[#f3c83e]">{item.name.slice(0, 1)}</span>
                <div className="min-w-0">
                  <p className="line-clamp-4 text-[0.67rem] leading-[1.45] text-white/78">“{item.quote}”</p>
                  <div className="mt-2 flex gap-0.5 text-[#f7cc2d]" aria-label="5 stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-2.5 fill-current" />)}</div>
                  <p className="mt-1 text-[0.59rem] font-semibold text-white">{item.name}</p>
                  <p className="text-[0.5rem] text-white/45">{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3" aria-label="Success stories coming soon">
            {[1, 2, 3].map((i) => <div key={i} className="min-h-[8.7rem] rounded-xl border border-white/10 bg-[#181b1a] p-4"><div className="h-3 w-24 rounded bg-white/8" /><div className="mt-5 h-2.5 w-full rounded bg-white/6" /><div className="mt-2 h-2.5 w-4/5 rounded bg-white/6" /></div>)}
          </div>
        )}
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="relative isolate overflow-hidden bg-[#1b2118] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_40%,rgba(255,191,61,.88),transparent_14%),linear-gradient(180deg,rgba(255,183,69,.25),rgba(21,27,18,.50)),linear-gradient(105deg,#26352a,#6e5d36_48%,#1d241d)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[#19241d]/75 [clip-path:polygon(0_72%,9%_48%,17%_63%,27%_32%,36%_59%,48%_28%,59%_52%,69%_27%,80%_49%,91%_20%,100%_42%,100%_100%,0_100%)]" />
      <div className="relative mx-auto grid min-h-[12rem] max-w-[1055px] items-center gap-6 px-6 py-7 lg:grid-cols-[1.25fr_.75fr] lg:px-[3.8rem]">
        <div>
          <h2 className="max-w-[17ch] font-serif text-[2.6rem] font-semibold leading-[0.92] tracking-[-0.035em] sm:text-[3rem]">A <span className="text-[#f1b436]">Healthier, Happier You</span><br />Is Closer Than You Think.</h2>
          <p className="mt-3 text-[0.76rem] text-white/80">Ask your questions. Get personalized guidance. Take the first step today.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <GradientButton href="/assistant">Ask Juice Doctor Now <ArrowRight className="size-4" /></GradientButton>
            <Link href="#how-it-works" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/65 bg-black/20 px-5 text-xs font-semibold"><Play className="size-3.5" /> Watch the Video</Link>
          </div>
        </div>
        <div className="relative hidden h-full min-h-[10rem] lg:block">
          <div className="absolute bottom-[-2rem] left-1/2 h-[10rem] w-16 -translate-x-1/2 rounded-t-full bg-[#161817] shadow-[0_-25px_70px_rgba(255,177,64,.28)]" />
          <div className="absolute bottom-[5rem] left-[43%] h-28 w-3 origin-bottom rotate-[32deg] rounded-full bg-[#161817]" />
          <div className="absolute bottom-[5rem] right-[43%] h-28 w-3 origin-bottom -rotate-[32deg] rounded-full bg-[#161817]" />
          <p className="absolute right-0 top-2 rotate-[-7deg] font-serif text-[1.4rem] italic leading-tight text-[#fff2ca]">Better<br />Health.<br />Brighter<br />Tomorrows ♡</p>
        </div>
      </div>
    </section>
  );
}

export function HomeReference({ testimonials }: HomeReferenceProps) {
  return (
    <div className="bg-[#080a09]">
      <Hero />
      <PressStrip />
      <HerneSection />
      <SpecialistsSection />
      <ResultsBand />
      <Testimonials testimonials={testimonials} />
      <ClosingCta />
    </div>
  );
}
