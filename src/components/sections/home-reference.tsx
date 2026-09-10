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
  'https://images.unsplash.com/photo-1775542188317-0f93e997db7e?auto=format&fit=crop&fm=jpg&q=88&w=2200';

const HERNE = [
  {
    key: 'pillar-one',
    letter: 'H',
    name: 'Hydration',
    copy: 'Fuel your body. Ignite your energy.',
    icon: Droplets,
    accent: '#63d9ff',
    border: '#167ca0',
    image:
      'https://images.unsplash.com/photo-1769129476922-4d2dae18cfdf?auto=format&fit=crop&fm=jpg&q=80&w=900',
  },
  {
    key: 'pillar-two',
    letter: 'E',
    name: 'Elimination',
    copy: 'Cleanse. Reset. Feel lighter.',
    icon: Leaf,
    accent: '#91e37b',
    border: '#387f3d',
    image:
      'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&fm=jpg&q=80&w=900',
  },
  {
    key: 'pillar-three',
    letter: 'R',
    name: 'Rest',
    copy: 'Deeper sleep. A brighter you.',
    icon: MoonStar,
    accent: '#b3a4ff',
    border: '#46538f',
    image:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd4297?auto=format&fit=crop&fm=jpg&q=80&w=900',
  },
  {
    key: 'pillar-four',
    letter: 'N',
    name: 'Nutrition',
    copy: 'Real food. Real vitality.',
    icon: UtensilsCrossed,
    accent: '#ffad64',
    border: '#99531f',
    image:
      'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&fm=jpg&q=80&w=900',
  },
  {
    key: 'pillar-five',
    letter: 'E',
    name: 'Exercise',
    copy: 'Move more. Live better.',
    icon: Dumbbell,
    accent: '#ff9957',
    border: '#9b4a21',
    image:
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&fm=jpg&q=80&w=900',
  },
] as const;

const QUICK_PROMPTS = [
  ['More energy', 'I want help improving my energy'],
  ['Better sleep', 'I want help improving my sleep'],
  ['Healthy weight', 'I want support with healthy weight management'],
  ['Detox support', 'I want support with my wellbeing and detox habits'],
] as const;

const fallbackStories = [
  {
    name: 'Member story',
    role: 'Ask Juice Doctor member',
    quote: 'The guidance feels practical, personal and simple enough to use in real life.',
  },
  {
    name: 'Member story',
    role: 'Ask Juice Doctor member',
    quote: 'Having one place to understand my next steps made the whole wellbeing journey feel clearer.',
  },
  {
    name: 'Member story',
    role: 'Ask Juice Doctor member',
    quote: 'The specialist support helped me focus on the habits that matter most instead of trying everything at once.',
  },
] as const;

function GradientButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[3.15rem] items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#ff672f_0%,#ffad29_48%,#ffe233_100%)] px-7 text-[0.82rem] font-extrabold text-black shadow-[0_12px_34px_rgba(240,124,31,.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105"
    >
      {children}
    </Link>
  );
}

function AssistantCard() {
  return (
    <div className="w-full rounded-[1.25rem] border border-white/20 bg-[#111412]/96 p-4 shadow-[0_25px_70px_rgba(0,0,0,.55)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="relative block size-[3.25rem] shrink-0 overflow-hidden rounded-full border-2 border-[#52bf5a] bg-[#1a1c1b]">
          <Image src="/specialists/makela.png" alt="Makela" fill sizes="52px" className="object-cover object-top" />
        </span>
        <div>
          <p className="text-[1rem] font-extrabold leading-none text-white">Hi, I&apos;m Makela</p>
          <p className="mt-1 text-[0.7rem] text-white/72">Your AI Wellbeing Concierge</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.58rem] text-white/56">
            <span className="size-1.5 rounded-full bg-[#20d55a] shadow-[0_0_8px_rgba(32,213,90,.8)]" />
            Online now
          </p>
        </div>
      </div>

      <div className="relative mt-4 rounded-[1rem] bg-[#f4f5f7] px-4 py-3 text-[0.73rem] font-medium leading-[1.35] text-[#151515]">
        How can I help you feel your best today?
        <span className="absolute -bottom-1.5 left-4 size-3 rotate-45 bg-[#f4f5f7]" aria-hidden />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {QUICK_PROMPTS.map(([label, prompt]) => (
          <Link
            key={label}
            href={`/assistant?prompt=${encodeURIComponent(prompt)}`}
            className="rounded-full border border-white/28 px-2 py-2 text-center text-[0.61rem] font-medium text-white/88 transition hover:border-[#f4cc34] hover:text-[#f4cc34]"
          >
            {label}
          </Link>
        ))}
      </div>

      <form action="/assistant" method="GET" className="mt-3 flex items-center rounded-full border border-white/10 bg-white/[0.07] p-1 pl-4">
        <input
          name="prompt"
          aria-label="Ask Makela a question"
          placeholder="Type your question..."
          className="min-w-0 flex-1 bg-transparent text-[0.66rem] text-white outline-none placeholder:text-white/38"
        />
        <button
          type="submit"
          aria-label="Send question"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#ff6b31,#ffad26,#ffe02e)] text-black transition hover:scale-105"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

function Hero() {
  const trust = [
    { icon: Leaf, text: <>Personalised<br />AI Guidance</>, tint: '#2ed05d' },
    { icon: BarChart3, text: <>Evidence-Based<br />Wellness</>, tint: '#38d66d' },
    { icon: Heart, text: <>Real Support.<br />Real Progress.</>, tint: '#ef633b' },
    { icon: Sparkles, text: <>A Healthier<br />Happier You</>, tint: '#f4c92f' },
  ];

  return (
    <section className="relative overflow-hidden border-b border-white/15 bg-[#070908] text-white">
      <div className="mx-auto grid min-h-[37rem] w-full max-w-[1480px] lg:grid-cols-[46%_54%]">
        <div className="relative z-20 flex flex-col justify-center px-6 py-14 sm:px-10 lg:px-14 xl:px-[4.75rem]">
          <div className="pointer-events-none absolute inset-y-0 left-0 right-[-9rem] -z-10 bg-[linear-gradient(90deg,#070908_0%,#070908_72%,rgba(7,9,8,.93)_83%,rgba(7,9,8,.40)_96%,transparent_100%)]" />
          <p className="text-[0.67rem] font-extrabold uppercase tracking-[0.25em] text-[#f19a2a]">Better habits. A brighter you.</p>
          <h1 className="mt-3 max-w-[8.4ch] font-serif text-[clamp(3.35rem,5.55vw,5.55rem)] font-semibold leading-[0.88] tracking-[-0.047em] text-[#faf9f5]">
            Your Healthier Happier Future <span className="bg-[linear-gradient(95deg,#ff6b2f_0%,#f49b27_45%,#f6da35_100%)] bg-clip-text text-transparent">Starts Here.</span>
          </h1>
          <p className="mt-5 max-w-[31rem] text-[clamp(.88rem,1.05vw,1rem)] leading-[1.48] text-white/78">
            Ask Juice Doctor AI gives you expert guidance, personalised to you. Real answers. Real change. A healthier, more energised life — within reach.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <GradientButton href="/assistant">Ask Juice Doctor Now <ArrowRight className="size-4" /></GradientButton>
            <Link
              href="#how-it-works"
              className="inline-flex min-h-[3.15rem] items-center justify-center gap-2 rounded-full border border-white/48 bg-black/25 px-6 text-[0.8rem] font-semibold text-white transition hover:bg-white/[0.06]"
            >
              <span className="grid size-5 place-items-center rounded-full border border-white/65"><Play className="size-2.5 fill-current" /></span>
              Watch How It Works
            </Link>
          </div>

          <div className="mt-7 grid max-w-[34rem] grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
            {trust.map(({ icon: Icon, text, tint }) => (
              <div key={tint} className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#101512]">
                  <Icon className="size-4" style={{ color: tint }} />
                </span>
                <span className="text-[0.56rem] leading-[1.28] text-white/72">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative min-h-[31rem] bg-cover bg-center lg:min-h-full"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,9,8,.45),transparent_30%),linear-gradient(0deg,rgba(7,9,8,.16),transparent_36%)]" />
          <p className="absolute right-[3.5%] top-[8%] hidden w-44 rotate-[-7deg] text-center font-serif text-[2.25rem] italic leading-[1.02] text-[#f8e9b6] drop-shadow-[0_2px_8px_rgba(0,0,0,.4)] 2xl:block">
            More Energy<br />A Brighter<br />You ♡
          </p>
          <div className="absolute bottom-7 right-[4%] w-[18.2rem] sm:w-[19.5rem] xl:right-[5%] xl:w-[20.5rem]">
            <AssistantCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function PressStrip() {
  const logos = [
    ['Forbes', 'font-serif text-[1.35rem] font-semibold'],
    ['mindbodygreen', 'text-[0.72rem] font-semibold'],
    ["Women'sHealth", 'font-serif text-[1.02rem] font-semibold'],
    ["Men'sHealth", 'font-serif text-[1.02rem] font-semibold'],
    ['GoodHousekeeping', 'font-serif text-[0.9rem] font-semibold'],
    ['TODAY', 'text-[0.9rem] font-black tracking-[-.05em]'],
  ];

  return (
    <section className="border-b border-white/15 bg-[#0a0c0b] text-white">
      <div className="mx-auto flex max-w-[1480px] items-center gap-8 px-6 py-5 sm:px-10 lg:px-14 xl:px-[4.75rem]">
        <p className="hidden shrink-0 text-[0.56rem] font-bold uppercase tracking-[0.28em] text-white/48 sm:block">Featured in</p>
        <div className="grid flex-1 grid-cols-3 items-center gap-5 text-center sm:grid-cols-6">
          {logos.map(([name, cls]) => <span key={name} className={`text-white/84 ${cls}`}>{name}</span>)}
        </div>
        <p className="hidden w-28 text-center text-[0.49rem] uppercase tracking-[0.19em] text-white/48 xl:block">A healthier<br />world is possible</p>
      </div>
    </section>
  );
}

function HerneCard({ item }: { item: (typeof HERNE)[number] }) {
  const Icon = item.icon;
  return (
    <Link
      href={`/framework#${item.key}`}
      className="group relative isolate flex min-h-[15.5rem] overflow-hidden rounded-[0.8rem] border bg-[#10120f] p-3 text-center transition duration-300 hover:-translate-y-1 hover:brightness-110"
      style={{ borderColor: item.border }}
    >
      <div className="absolute inset-0 -z-20 bg-cover bg-center transition duration-500 group-hover:scale-[1.035]" style={{ backgroundImage: `url(${item.image})` }} />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,.02)_0%,rgba(2,5,5,.07)_32%,rgba(2,6,6,.72)_69%,rgba(2,5,5,.96)_100%)]" />
      <div className="flex w-full flex-col items-center justify-end">
        <Icon className="mb-auto mt-3 size-8 opacity-80" style={{ color: item.accent }} />
        <span className="font-serif text-[2.05rem] leading-none" style={{ color: item.accent }}>{item.letter}</span>
        <h3 className="mt-0.5 font-serif text-[1.02rem] leading-tight" style={{ color: item.accent }}>{item.name}</h3>
        <p className="mt-2 max-w-[9rem] text-[0.61rem] leading-[1.35] text-white/78">{item.copy}</p>
      </div>
    </Link>
  );
}

function HerneSection() {
  return (
    <section id="how-it-works" className="border-b border-white/15 bg-[#090b0a] py-9 text-white sm:py-11">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-6 sm:px-10 lg:grid-cols-[26%_74%] lg:px-14 xl:px-[4.75rem]">
        <div className="self-center lg:pr-5">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.24em] text-[#ef8f2b]">The HERNE Protocol</p>
          <h2 className="mt-2 max-w-[8ch] font-serif text-[clamp(2.6rem,3.6vw,4.15rem)] font-medium leading-[0.92] tracking-[-0.04em] text-[#f7f4ec]">Five Pillars. A Healthier You.</h2>
          <p className="mt-4 max-w-[22rem] text-[0.78rem] leading-[1.52] text-white/72">
            The HERNE Protocol is our framework for total wellbeing — designed to help you feel better, live longer, and become the best version of you.
          </p>
          <div className="mt-5">
            <GradientButton href="/framework">Explore The HERNE Protocol <ArrowRight className="size-4" /></GradientButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {HERNE.map((item) => <HerneCard key={item.key} item={item} />)}
        </div>
      </div>
    </section>
  );
}

function SpecialistAvatar({ profile, index }: { profile: ReturnType<typeof websiteProfiles>[number]; index: number }) {
  const initials = profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const border = index === 0 ? '#50bd58' : index % 2 === 0 ? '#d7b83e' : '#779879';
  return (
    <Link href={`/specialists/${profile.slug}`} className="group flex min-w-0 flex-col items-center text-center">
      <span className="relative grid size-[4.7rem] place-items-center overflow-hidden rounded-full border-2 bg-[radial-gradient(circle_at_35%_30%,#59665d,#1c211d_60%,#0c0f0d)] shadow-[0_5px_18px_rgba(0,0,0,.35)]" style={{ borderColor: border }}>
        {profile.portrait ? (
          <Image src={profile.portrait} alt={profile.name} fill sizes="76px" className="object-cover object-top transition duration-300 group-hover:scale-105" />
        ) : (
          <span className="font-serif text-[1.25rem] text-white/88">{initials}</span>
        )}
        {profile.isConcierge && <span className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-[#0a0c0b] bg-[#20d558]" />}
      </span>
      <strong className="mt-2 block max-w-[7.5rem] text-[0.68rem] font-semibold leading-tight text-white/90">{profile.name}</strong>
      <span className="mt-1 block max-w-[8rem] text-[0.52rem] leading-[1.25] text-white/50">{profile.title}</span>
    </Link>
  );
}

function SpecialistsSection() {
  const profiles = websiteProfiles();
  return (
    <section className="relative overflow-hidden border-b border-white/15 bg-[#090b0a] py-8 text-white sm:py-10">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-6 sm:px-10 lg:grid-cols-[26%_74%] lg:px-14 xl:px-[4.75rem]">
        <div className="self-center lg:pr-4">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.24em] text-[#f1a32e]">Meet your AI wellness team</p>
          <h2 className="mt-2 max-w-[9ch] font-serif text-[clamp(2.45rem,3.4vw,3.9rem)] font-medium leading-[0.92] tracking-[-0.04em]">Real Expertise. Always by Your Side.</h2>
          <p className="mt-4 max-w-[22rem] text-[0.77rem] leading-[1.5] text-white/72">
            Led by Makela, your AI concierge, with a team of 8 specialist AI experts — here to answer your questions, create personalised plans, and support you every step of the way.
          </p>
          <div className="mt-5">
            <GradientButton href="/specialists">Meet All Our Specialists <ArrowRight className="size-4" /></GradientButton>
          </div>
        </div>

        <div className="relative self-center">
          <p className="absolute -right-2 -top-10 hidden rotate-[-7deg] font-serif text-[1.8rem] italic leading-none text-[#f3c741] xl:block">A Healthier,<br />Happier You ♡</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4 xl:grid-cols-8 xl:gap-x-3">
            {profiles.map((profile, index) => <SpecialistAvatar key={profile.slug} profile={profile} index={index} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultsBand() {
  const stats = [
    ['92%', 'Feel more energy', 'within 30 days'],
    ['87%', 'Report better sleep', 'and mood'],
    ['3x', 'More likely to stick to', 'healthy habits'],
  ];

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#1b2418] text-white">
      <div className="absolute inset-0 opacity-45 [background:radial-gradient(circle_at_24%_22%,rgba(123,144,60,.38),transparent_30%),linear-gradient(110deg,#152016,#29331d_50%,#111612)]" />
      <div className="relative mx-auto grid max-w-[1480px] items-center gap-7 px-6 py-6 sm:px-10 md:grid-cols-[1.1fr_3fr_1.35fr] lg:px-14 xl:px-[4.75rem]">
        <p className="text-[1rem] font-bold uppercase leading-[1.25] tracking-[0.17em]">Real People.<br />Real Results.</p>
        <div className="grid grid-cols-3 divide-x divide-white/28">
          {stats.map(([value, line1, line2]) => (
            <div key={value} className="px-4 text-center first:pl-0 last:pr-0">
              <p className="font-serif text-[clamp(2.15rem,3.1vw,3.25rem)] leading-none text-[#f5d544]">{value}</p>
              <p className="mt-1 text-[0.65rem] leading-[1.25] text-white/86">{line1}<br />{line2}</p>
            </div>
          ))}
        </div>
        <p className="hidden rotate-[-4deg] text-right font-serif text-[1.25rem] italic leading-[1.15] text-[#f7efd1] lg:block">“Small changes<br />create extraordinary lives.”<br /><span className="mt-2 inline-block font-sans text-[0.45rem] not-italic tracking-[0.18em] text-white/62">— ASK JUICE DOCTOR AI</span></p>
      </div>
    </section>
  );
}

function SuccessStories({ testimonials }: { testimonials: Testimonial[] }) {
  const stories = testimonials.length
    ? testimonials.slice(0, 3).map((story) => ({ name: story.name, role: story.role, quote: story.quote }))
    : fallbackStories;

  return (
    <section id="success-stories" className="border-b border-white/14 bg-[#090b0a] py-8 text-white sm:py-10">
      <div className="mx-auto grid max-w-[1480px] gap-7 px-6 sm:px-10 lg:grid-cols-[22%_78%] lg:px-14 xl:px-[4.75rem]">
        <div>
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.24em] text-[#ef8930]">Success stories</p>
          <h2 className="mt-2 max-w-[7.5ch] font-serif text-[clamp(2.45rem,3.4vw,3.8rem)] font-medium leading-[0.92] tracking-[-0.04em]">Real People. Brighter Lives.</h2>
          <p className="mt-4 max-w-[18rem] text-[0.74rem] leading-[1.5] text-white/68">See how members are using Ask Juice Doctor AI to make their wellbeing journey clearer, simpler and more personal.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {stories.map((story, index) => (
            <article key={`${story.name}-${index}`} className="rounded-[0.85rem] border border-white/10 bg-[linear-gradient(145deg,#202421,#151816)] p-4 shadow-[0_12px_24px_rgba(0,0,0,.18)]">
              <div className="flex gap-3">
                <span className="grid size-14 shrink-0 place-items-center rounded-full border border-[#9a7752] bg-[linear-gradient(135deg,#8c6747,#29302b)] font-serif text-lg text-white">{story.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] leading-[1.4] text-white/84">“{story.quote}”</p>
                  <div className="mt-2 flex text-[#f0c62d]" aria-label="5 stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-2.5 fill-current" />)}</div>
                  <p className="mt-1 text-[0.6rem] font-semibold text-white/82">{story.name}</p>
                  <p className="text-[0.5rem] text-white/44">{story.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="relative isolate overflow-hidden bg-[#17160e] text-white">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(8,9,8,.80)_0%,rgba(8,9,8,.52)_36%,rgba(8,9,8,.16)_68%,rgba(8,9,8,.35)_100%),url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&fm=jpg&q=82&w=2200')] bg-cover bg-center" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(5,7,6,.15),transparent_45%)]" />
      <div className="mx-auto flex min-h-[13rem] max-w-[1480px] items-center px-6 py-8 sm:px-10 lg:px-14 xl:px-[4.75rem]">
        <div className="max-w-[46rem]">
          <h2 className="max-w-[15ch] font-serif text-[clamp(2.75rem,4.55vw,5.2rem)] font-medium leading-[0.88] tracking-[-0.045em] text-[#f8f5ed]">A <span className="text-[#f4cb35]">Healthier, Happier You</span> Is Closer Than You Think.</h2>
          <p className="mt-3 text-[0.75rem] text-white/80">Ask your questions. Get personalised guidance. Take the first step today.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <GradientButton href="/assistant">Ask Juice Doctor Now <ArrowRight className="size-4" /></GradientButton>
            <Link href="#how-it-works" className="inline-flex min-h-[3.15rem] items-center justify-center gap-2 rounded-full border border-white/55 bg-black/30 px-6 text-[0.78rem] font-semibold text-white transition hover:bg-white/[0.07]"><span className="grid size-5 place-items-center rounded-full border border-white/60"><Play className="size-2.5 fill-current" /></span>Watch the Video</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeReference({ testimonials }: HomeReferenceProps) {
  return (
    <div className="bg-[#070908]">
      <Hero />
      <PressStrip />
      <HerneSection />
      <SpecialistsSection />
      <ResultsBand />
      <SuccessStories testimonials={testimonials} />
      <ClosingCta />
    </div>
  );
}
