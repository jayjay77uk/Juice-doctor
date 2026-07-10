import type { Metadata } from 'next';
import { Droplets, Moon, Flame, TrendingUp, CalendarDays } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { hernePillars } from '@/content/herne';

export const metadata: Metadata = createMetadata({ title: 'Dashboard', path: '/dashboard' });

const kpis = [
  { label: 'Hydration', value: '78', unit: '/100', icon: Droplets, trend: '+6' },
  { label: 'Rest', value: '64', unit: '/100', icon: Moon, trend: '+3' },
  { label: 'Energy', value: '71', unit: '/100', icon: Flame, trend: '+9' },
  { label: 'Overall', value: '72', unit: '/100', icon: TrendingUp, trend: '+5' },
];

const upcoming = [
  { title: 'Follow-up session with Erran', when: 'Thu 17 Jul · 4:00pm', tag: '1:1' },
  { title: 'Week 4 check-in call', when: 'Mon 21 Jul · 9:00am', tag: 'Group' },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">Your programme · Week 3 of 12</p>
        <h1 className="text-h2">Welcome back</h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-full bg-teal-100 text-primary">
                <kpi.icon className="size-4.5" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-secondary">
                {kpi.trend}
              </span>
            </div>
            <p className="mt-4 font-serif text-3xl text-foreground">
              {kpi.value}
              <span className="text-base text-muted-foreground">{kpi.unit}</span>
            </p>
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Progress */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-serif text-lg text-foreground">Your HERNE pillars this week</h2>
          <ul className="mt-5 flex flex-col gap-4">
            {hernePillars.map((pillar, i) => {
              const value = [78, 62, 64, 70, 58][i] ?? 60;
              return (
                <li key={pillar.key} className="flex items-center gap-4">
                  <span className="w-24 shrink-0 text-sm font-medium text-foreground">
                    {pillar.name}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${value}%` }}
                    />
                  </span>
                  <span className="w-9 text-right text-sm tabular-nums text-muted-foreground">
                    {value}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Upcoming */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-serif text-lg text-foreground">Upcoming</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {upcoming.map((item) => (
              <li key={item.title} className="flex items-start gap-3 rounded-xl bg-surface-muted p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-primary">
                  <CalendarDays className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
        Prototype — this dashboard shows sample data to demonstrate the member experience. No real
        account or programme data is connected.
      </p>
    </div>
  );
}
