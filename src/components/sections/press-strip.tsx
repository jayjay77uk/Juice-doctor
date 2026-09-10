import * as React from 'react';
import { Brain, HeartPulse, Layers3, Leaf } from 'lucide-react';
import { Container } from '@/components/ui/container';

const items = [
  { icon: Leaf, label: 'The HERNE Protocol', note: 'Five connected wellbeing pillars' },
  { icon: Brain, label: 'AI concierge', note: 'Start with Makela' },
  { icon: HeartPulse, label: 'Specialist team', note: 'Eight focused roles' },
  { icon: Layers3, label: 'Shared context', note: 'One joined-up journey' },
];

export function PressStrip() {
  return (
    <section className="border-y border-[#242424] bg-[#101010] text-white">
      <Container className="grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {items.map(({ icon: Icon, label, note }) => (
          <div key={label} className="flex items-center gap-3 px-2 py-5 sm:px-5 lg:px-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#ec922a]/25 bg-[#ec922a]/10 text-[#f2c92a]">
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-0.5 text-xs text-white/45">{note}</p>
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}
