import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lotus } from './lotus';
import { websiteProfiles } from '@/data/herne/website-profiles';

/** Premium specialist section for the homepage — brief, Makela-first, all eight, no biographies. */
export function SpecialistsHomeSection() {
  const profiles = websiteProfiles();
  return (
    <section className="bg-[#0a1420] text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="text-center">
          <Lotus className="mx-auto size-9 text-[#c9a961]" />
          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[#c9a961]">Your Wellbeing Institute</p>
          <h2 className="mt-3 font-serif text-3xl text-[#f3ecdd] sm:text-4xl">Meet your specialist team</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/60">
            Start with Makela, your concierge — she listens first, then coordinates a team of specialists around one shared care plan.
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-4xl grid-cols-4 gap-4 sm:grid-cols-8">
          {profiles.map((p) => (
            <li key={p.slug}>
              <Link href={`/specialists/${p.slug}`} className="group flex flex-col items-center gap-2 outline-none">
                <span className="relative grid size-16 place-items-center overflow-hidden rounded-full border border-[#c9a961]/30 bg-[#12233a] ring-[#c9a961] transition group-hover:ring-2 group-focus-visible:ring-2 sm:size-[4.5rem]">
                  {p.portrait ? (
                    <Image src={p.portrait} alt={p.name} fill sizes="72px" className="object-cover object-top" />
                  ) : (
                    <span className="font-serif text-xl text-[#c9a961]">{p.name.charAt(0)}</span>
                  )}
                </span>
                <span className="text-center text-xs font-medium text-[#e8dcc4]">{p.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-[#c9a961] text-[#0a1420] hover:bg-[#d8bd7f]">
            <Link href="/assistant">Ask Makela to guide me</Link>
          </Button>
          <Button asChild size="lg" intent="ghost" className="border border-white/25 text-white hover:bg-white/10">
            <Link href="/specialists">
              View all specialists <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
