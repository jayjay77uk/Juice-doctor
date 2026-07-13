import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Check, X, Users, Activity, ArrowRight, Compass } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { Button } from '@/components/ui/button';
import { Lotus } from '@/components/specialists/lotus';
import { websiteProfile, websiteProfiles } from '@/data/herne/website-profiles';

export function generateStaticParams() {
  return websiteProfiles().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = websiteProfile(slug);
  if (!p) return createMetadata({ title: 'Specialist', path: `/specialists/${slug}` });
  return createMetadata({ title: `${p.name} — ${p.title}`, description: p.opening, path: `/specialists/${slug}` });
}

function Draft() {
  return <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-800">Draft — awaiting client approval</span>;
}

export default async function SpecialistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = websiteProfile(slug);
  if (!p) notFound();

  const pillars = p.hernePriority.split(/[;,]/).map((s) => s.trim()).filter(Boolean);

  return (
    <div className="flex flex-col">
      {/* Portrait hero */}
      <section className="bg-[#0a1420] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[420px_1fr] lg:py-20">
          <div className="mx-auto w-full max-w-sm">
            {p.portrait ? (
              <Image
                src={p.portrait}
                alt={`${p.name}, ${p.title}`}
                width={480}
                height={640}
                priority
                className="w-full rounded-2xl object-cover shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]"
              />
            ) : (
              <div className="flex aspect-[3/4] flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-b from-[#12233a] to-[#0a1420] text-center">
                <Lotus className="size-10 text-[#c9a961]" />
                <span className="grid size-24 place-items-center rounded-full border border-[#c9a961]/40 font-serif text-4xl text-[#c9a961]">
                  {p.name.charAt(0)}
                </span>
                <p className="text-xs uppercase tracking-widest text-white/30">Portrait to follow</p>
              </div>
            )}
          </div>

          <div>
            {p.isConcierge ? <p className="text-xs uppercase tracking-[0.2em] text-[#c9a961]">Your Wellbeing Concierge · start here</p> : <p className="text-xs uppercase tracking-[0.2em] text-[#c9a961]">HERNE specialist</p>}
            <h1 className="mt-3 font-serif text-4xl text-[#f3ecdd] sm:text-5xl">{p.name}</h1>
            <p className="mt-2 text-lg text-white/70">{p.title}</p>
            <p className="mt-6 max-w-xl font-serif text-xl italic text-[#e8dcc4]">“{p.opening}”</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[#c9a961] text-[#0a1420] hover:bg-[#d8bd7f]">
                <Link href="/assistant">{p.isConcierge ? 'Ask Makela to guide me' : `Start a conversation`}</Link>
              </Button>
              {!p.isConcierge ? (
                <Button asChild size="lg" intent="ghost" className="border border-white/25 text-white hover:bg-white/10">
                  <Link href="/specialists/makela">Ask Makela to guide me</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-8">
          <section>
            {p.intro.map((para, i) => (
              <p key={i} className="mb-3 text-foreground">{para}</p>
            ))}
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">How I can help</h2>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {p.howICanHelp.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-secondary" /> {h}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Check className="size-4 text-secondary" /> What I can help with</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.allowedActions}.</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><X className="size-4 text-danger" /> What I will not do</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.mustNotDo}.</p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Users className="size-4 text-primary" /> How I work with your team</p>
            <p className="mt-2 text-sm text-muted-foreground">{p.referralStyle}. Everything I suggest is added to your one shared care plan, and I hand over with full context so you never repeat yourself.</p>
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Consultation principle</p>
            <p className="mt-1 font-serif text-lg text-foreground">“{p.principle}”</p>
          </div>
          {p.philosophy ? (
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Philosophy{p.philosophyStatus !== 'client_supplied' ? <Draft /> : null}</p>
              <p className="mt-1 text-sm italic text-foreground">“{p.philosophy}”</p>
            </div>
          ) : null}
          {pillars.length ? (
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Compass className="size-4" /> HERNE priorities</p>
              <p className="mt-2 text-sm text-foreground">{p.hernePriority}</p>
            </div>
          ) : null}
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Activity className="size-4" /> Wearable insight</p>
            <p className="mt-2 text-sm text-muted-foreground">{p.wearableAccess}. Shown as trends, with your consent, never as a diagnosis.</p>
          </div>
          {p.greetingStatus !== 'client_supplied' ? (
            <p className="text-xs text-amber-700">Signature greeting is a draft awaiting client approval.</p>
          ) : null}
        </aside>
      </div>

      <section className="bg-cream-100">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-8">
          <p className="font-serif text-2xl italic text-foreground">“{p.closing}”</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg"><Link href="/assistant">Start a conversation</Link></Button>
            <Button asChild size="lg" intent="ghost"><Link href="/specialists">Meet the whole team <ArrowRight className="ml-1 size-4" /></Link></Button>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Prototype — general wellbeing support only, not diagnosis. {p.name} escalates to a human practitioner when clinical review is needed.
          </p>
        </div>
      </section>
    </div>
  );
}
