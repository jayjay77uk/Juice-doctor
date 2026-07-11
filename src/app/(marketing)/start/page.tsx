import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { receptionist } from '@/services/receptionist';
import { specialists } from '@/services/specialists';
import { Container } from '@/components/ui/container';
import { ReceptionistConsole } from '@/components/receptionist/receptionist-console';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = createMetadata({
  title: 'Meet the Receptionist AI',
  description: 'Talk to our AI receptionist and get matched with the right specialist AI for your goals.',
  path: '/start',
});

export default async function StartPage() {
  const catalogueResult = await specialists.catalogue();
  const specialistOptions = (catalogueResult.ok ? catalogueResult.data : []).map((s) => ({
    slug: s.slug,
    name: s.name,
    tagline: s.product?.tagline ?? s.description,
    priceLabel: s.product?.priceLabel ?? '',
  }));

  return (
    <section className="relative overflow-hidden bg-cream-50 py-14 sm:py-20">
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <Container className="relative flex flex-col items-center gap-8">
        <div className="max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Start here</p>
          <h1 className="mt-3 text-h1 text-foreground">Meet your AI receptionist</h1>
          <p className="mx-auto mt-3 max-w-lg text-lg text-muted-foreground">
            Every journey starts with a quick chat. Our receptionist understands your goals and
            matches you with the right specialist AI — or a human expert when that’s the better call.
          </p>
        </div>
        <ReceptionistConsole questions={receptionist.questions} specialists={specialistOptions} />
      </Container>
    </section>
  );
}
