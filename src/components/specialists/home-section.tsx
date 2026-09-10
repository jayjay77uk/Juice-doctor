import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
import { websiteProfiles } from '@/data/herne/website-profiles';
import { Container } from '@/components/ui/container';

export function SpecialistsHomeSection() {
  const profiles = websiteProfiles();

  return (
    <section className="bg-[#fffaf2] py-20 sm:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#44a54a]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#276b2d]">
              <Sparkles className="size-3.5" />
              Your wellbeing team
            </div>
            <h2 className="mt-5 max-w-[11ch] text-h1 text-[#111]">Real specialist focus, coordinated around you.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#6f6b63]">
              Makela is your concierge. When you need deeper support, she can connect you with the specialist whose role best matches the conversation while the wider journey stays connected.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/assistant" className="brand-gradient inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#111]">
                Ask Makela
              </Link>
              <Link href="/specialists" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#c8bba8] px-5 text-sm font-semibold text-[#111] hover:bg-white">
                Meet all specialists <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {profiles.map((profile, index) => (
              <li key={profile.slug}>
                <Link
                  href={`/specialists/${profile.slug}`}
                  className="group relative block overflow-hidden rounded-[1.45rem] border border-[#e5d7c2] bg-white p-3 shadow-[var(--shadow-soft)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.05rem] bg-[#171717]">
                    {profile.portrait ? (
                      <Image
                        src={profile.portrait}
                        alt={profile.name}
                        fill
                        sizes="(max-width: 640px) 45vw, 20vw"
                        className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center font-serif text-5xl text-[#f2c92a]">{profile.name.charAt(0)}</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-transparent" />
                    <span
                      className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-xs font-bold text-[#111]"
                      style={{ backgroundColor: ['#f2c92a', '#44a54a', '#ec922a', '#e04728'][index % 4] }}
                    >
                      {index + 1}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                      <p className="font-serif text-lg leading-tight">{profile.name}</p>
                      <p className="mt-1 line-clamp-2 text-[0.68rem] uppercase tracking-[0.11em] text-white/55">{profile.title}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
