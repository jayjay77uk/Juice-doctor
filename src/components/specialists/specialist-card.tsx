import Link from 'next/link';
import Image from 'next/image';
import { Lotus } from './lotus';
import type { WebsiteProfile } from '@/data/herne/website-profiles';

/**
 * A specialist gallery card. Where the client supplied a finished portrait card
 * (Makela, Serena) it is shown as-is; the remaining specialists use an elegant
 * navy + gold card in the same language, flagged as awaiting the client portrait.
 */
export function SpecialistCard({ profile }: { profile: WebsiteProfile }) {
  return (
    <Link
      href={`/specialists/${profile.slug}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-[#0e1b2a] shadow-[0_10px_40px_-15px_rgba(10,20,32,0.6)] outline-none ring-[#c9a961] transition-transform duration-300 hover:-translate-y-1 focus-visible:ring-2"
    >
      {profile.portrait ? (
        <Image
          src={profile.portrait}
          alt={`${profile.name}, ${profile.title}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover object-top"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#12233a] to-[#0a1420] px-5 text-center">
          <Lotus className="size-9 text-[#c9a961]" />
          <span className="grid size-20 place-items-center rounded-full border border-[#c9a961]/40 font-serif text-3xl text-[#c9a961]">
            {profile.name.charAt(0)}
          </span>
          <div>
            <p className="font-serif text-2xl tracking-wide text-[#e8dcc4]">{profile.name}</p>
            <p className="mx-auto mt-1 max-w-[16rem] text-xs uppercase tracking-[0.12em] text-[#c9a961]">{profile.title}</p>
          </div>
          <p className="max-w-[15rem] font-serif text-sm italic text-white/70">“{profile.principle}”</p>
          <span className="absolute bottom-3 text-[10px] uppercase tracking-widest text-white/30">Portrait to follow</span>
        </div>
      )}

      {/* hover / focus veil with the call to action */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-[#0a1420]/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="mb-5 rounded-full border border-[#c9a961]/60 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[#e8dcc4]">
          View profile
        </span>
      </div>
    </Link>
  );
}
