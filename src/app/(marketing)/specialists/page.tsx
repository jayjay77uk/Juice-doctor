import Link from 'next/link';
import { Globe, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { Button } from '@/components/ui/button';
import { SpecialistCard } from '@/components/specialists/specialist-card';
import { Lotus } from '@/components/specialists/lotus';
import { websiteProfiles, HERNE_MULTILINGUAL_STATEMENT, HERNE_SHARED_DNA } from '@/data/herne/website-profiles';
import { HERNE_LANGUAGES } from '@/data/herne/languages';

export const metadata = createMetadata({
  title: 'Your Wellbeing Institute — Meet Your Specialist Team',
  description: 'A coordinated team of wellbeing specialists, one shared care plan, and evidence-informed guidance — by voice or text, in your language.',
  path: '/specialists',
});

const COLLAB_STEPS = [
  { label: 'Makela', note: 'listens first & coordinates' },
  { label: 'Your specialist', note: 'guides your main concern' },
  { label: 'Supporting specialist', note: 'adds their expertise' },
  { label: 'Shared care plan', note: 'one plan, kept aligned' },
  { label: 'Makela follows up', note: 'reconciles & plans next steps' },
  { label: 'Human practitioner', note: 'when clinical review is needed' },
];

export default function SpecialistsPage() {
  const profiles = websiteProfiles();

  return (
    <div className="flex flex-col">
      {/* Hero — private wellbeing institute */}
      <section className="relative overflow-hidden bg-[#0a1420] text-white">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <Lotus className="mx-auto size-10 text-[#c9a961]" />
          <p className="mt-6 text-xs uppercase tracking-[0.28em] text-[#c9a961]">Your Wellbeing Institute</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-[#f3ecdd] sm:text-6xl">
            Meet your <span className="text-[#c9a961]">specialist team</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            A team of expert advisors, powered by intelligence, guided by empathy, and dedicated to you — one coordinated
            team, one shared care plan, one personal wellbeing journey.
          </p>

          <p className="mx-auto mt-8 max-w-2xl border-y border-white/10 py-6 font-serif text-lg italic text-[#e8dcc4]">
            “{HERNE_MULTILINGUAL_STATEMENT}”
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-white/60">
            <span className="inline-flex items-center gap-2"><MessageSquare className="size-4 text-[#c9a961]" /> Voice or text conversations</span>
            <span className="inline-flex items-center gap-2"><Globe className="size-4 text-[#c9a961]" /> Multiple languages</span>
            <span className="inline-flex items-center gap-2"><Globe className="size-4 text-[#c9a961]" /> Regional dialect support</span>
          </div>
          <p className="mt-2 text-xs uppercase tracking-widest text-white/30">Voice & full language support — prototype / planned</p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-[#c9a961] text-[#0a1420] hover:bg-[#d8bd7f]">
              <Link href="/assistant">Ask Makela to guide me</Link>
            </Button>
            <Button asChild size="lg" intent="ghost" className="border border-white/25 text-white hover:bg-white/10">
              <Link href="/assistant">Start a conversation</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Shared DNA */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">One team, one philosophy</p>
            <h2 className="mt-3 font-serif text-3xl text-foreground">The values every specialist shares</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Your specialists draw on one approved HERNE evidence base and keep one coordinated care plan — so their
              guidance always works together.
            </p>
          </div>
          <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {HERNE_SHARED_DNA.map((d) => (
              <li key={d} className="flex items-start gap-3 text-sm text-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-secondary" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Languages */}
      <section className="border-b border-border bg-cream-50">
        <div className="mx-auto max-w-5xl px-5 py-14 text-center sm:px-8">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">In your language</p>
          <h2 className="mt-3 font-serif text-3xl text-foreground">Speak the way you think</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Choose your language in settings and your specialists reply in it — one shared evidence base, spoken your way.
          </p>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2.5">
            {HERNE_LANGUAGES.map((l) => (
              <li
                key={l.code}
                dir={l.rtl ? 'rtl' : 'ltr'}
                className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-foreground"
                title={l.englishName}
              >
                {l.nativeName}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted-foreground">
            Language replies are AI-generated and not yet human-reviewed for clinical accuracy — English is the reference
            version. Voice conversations are planned.
          </p>
        </div>
      </section>

      {/* Specialist gallery */}
      <section className="bg-cream-100">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="text-center">
            <h2 className="font-serif text-3xl text-foreground">Your specialists</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Start with Makela, your concierge — she listens first, then introduces you to the specialists best placed to help.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {profiles.map((p) => (
              <SpecialistCard key={p.slug} profile={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration journey */}
      <section className="bg-[#0a1420] text-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#c9a961]">Coordinated support</p>
            <h2 className="mt-3 font-serif text-3xl text-[#f3ecdd]">How your team works together</h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/60">
              Your specialists are never isolated. They hand work to each other with full context, so you never start over.
            </p>
          </div>
          <ol className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {COLLAB_STEPS.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                  <p className="font-medium text-[#e8dcc4]">{s.label}</p>
                  <p className="mt-0.5 text-xs text-white/50">{s.note}</p>
                </div>
                {i < COLLAB_STEPS.length - 1 ? <ArrowRight className="hidden size-4 shrink-0 text-[#c9a961] sm:block" /> : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA + prototype notice */}
      <section className="bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
          <h2 className="font-serif text-3xl text-foreground">Your journey starts with one conversation</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/assistant">Ask Makela to guide me</Link>
            </Button>
            <Button asChild size="lg" intent="ghost">
              <Link href="/assistant">Start a conversation</Link>
            </Button>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Prototype — this is a demonstration of the wellbeing-institute experience. Specialists provide general
            wellbeing support, not diagnosis, and escalate to a human when clinical review is needed.
          </p>
        </div>
      </section>
    </div>
  );
}
