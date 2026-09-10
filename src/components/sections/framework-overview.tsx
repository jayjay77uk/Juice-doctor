import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { routes } from '@/config/routes';
import { Container } from '@/components/ui/container';

const pillars = [
  { letter: 'H', name: 'Hydration', line: 'Support the body with consistent hydration.', accent: '#ec922a' },
  { letter: 'E', name: 'Elimination', line: 'Create space for healthy daily elimination.', accent: '#44a54a' },
  { letter: 'R', name: 'Rest', line: 'Make recovery and restorative sleep part of the plan.', accent: '#f2c92a' },
  { letter: 'N', name: 'Nutrition', line: 'Build practical nutrition habits around real life.', accent: '#e04728' },
  { letter: 'E', name: 'Exercise', line: 'Use movement to support strength and long-term wellbeing.', accent: '#44a54a' },
];

export function FrameworkOverview() {
  return (
    <section className="bg-[#0d0d0d] py-20 text-white sm:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ec922a]">The HERNE Protocol</p>
            <h2 className="mt-4 max-w-[10ch] text-h1 text-white">Five pillars. One connected approach.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/58">
              HERNE brings Hydration, Elimination, Rest, Nutrition and Exercise into one framework so each part of your wellbeing can be considered together.
            </p>
            <Link
              href={routes.framework.href}
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/18 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#f2c92a]/50 hover:bg-white/[0.05]"
            >
              Explore the HERNE Protocol <ArrowRight className="size-4" />
            </Link>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {pillars.map((pillar, index) => (
              <li
                key={`${pillar.letter}-${pillar.name}`}
                className="group relative min-h-[16rem] overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#151515] p-5 transition-transform duration-300 hover:-translate-y-1"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: pillar.accent }}
                  aria-hidden
                />
                <span className="text-xs font-semibold text-white/30">0{index + 1}</span>
                <span className="mt-8 block font-serif text-6xl" style={{ color: pillar.accent }}>{pillar.letter}</span>
                <h3 className="mt-3 text-xl text-white">{pillar.name}</h3>
                <p className="mt-3 text-sm leading-6 text-white/48">{pillar.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
