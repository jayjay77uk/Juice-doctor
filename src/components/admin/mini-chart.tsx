import * as React from 'react';

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * A lightweight, dependency-free SVG bar chart for dashboard widgets. Renders an
 * accessible summary and scales bars to the max value. Server-safe (no client JS).
 */
export function MiniBarChart({
  data,
  height = 160,
  ariaLabel,
}: {
  data: ChartPoint[];
  height?: number;
  ariaLabel: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barGap = 2;
  const width = 100;
  const barWidth = data.length > 0 ? (width - barGap * (data.length - 1)) / data.length : 0;

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        className="h-40 w-full"
      >
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 4);
          const x = i * (barWidth + barGap);
          const y = height - barHeight;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={0.8}
              className="fill-[var(--color-teal-500)]"
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}
