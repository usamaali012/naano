import { useState } from "react";
import type { ClicksDay } from "@naano/shared";

interface ClicksChartProps {
  days: ClicksDay[];
}

const W = 700;
const H = 170;
const CHART_H = 130;
const GAP = 3;

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// Clicks per day, last 30 days, as a token-only inline SVG bar chart — same
// restraint as creator/EarningsChart, no charting dependency. A label every
// 7th day keeps the x-axis legible without crowding 30 dates. Hovering or
// keyboard-focusing a bar shows its exact day and count in a small tooltip;
// each bar's hit target is the full chart height, since the bar itself can be
// only a couple of pixels tall on a light day.
export function ClicksChart({ days }: ClicksChartProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const allZero = days.every((d) => d.clicks === 0);
  if (allZero) {
    return (
      <p className="text-body text-text-muted">
        No clicks in the last 30 days yet.
      </p>
    );
  }

  const max = Math.max(1, ...days.map((d) => d.clicks));
  const barWidth = (W - GAP * (days.length - 1)) / days.length;
  const active = activeIndex !== null ? days[activeIndex] : null;
  const activeCenterX =
    activeIndex !== null ? activeIndex * (barWidth + GAP) + barWidth / 2 : W / 2;
  const activeLeftPct = (activeCenterX / W) * 100;

  return (
    <div className="relative">
      {active && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-card border border-border bg-surface px-s3 py-s2 text-label"
          style={{ left: `${activeLeftPct}%` }}
        >
          <span className="font-medium text-text">{dayLabel(active.date)}</span>{" "}
          <span className="tabular-nums text-text-muted">
            {active.clicks} {active.clicks === 1 ? "click" : "clicks"}
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Clicks per day, last 30 days, oldest to newest: ${days
          .map((d) => `${d.date}, ${d.clicks}`)
          .join("; ")}`}
      >
        {days.map((d, i) => {
          const x = i * (barWidth + GAP);
          const barH = d.clicks === 0 ? 1 : Math.max(2, (d.clicks / max) * CHART_H);
          const y = CHART_H - barH;
          const isActive = i === activeIndex;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx="2"
                fill={
                  isActive
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 45%, white)"
                }
              />
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={CHART_H}
                fill="transparent"
                tabIndex={0}
                aria-label={`${dayLabel(d.date)}, ${d.clicks} ${d.clicks === 1 ? "click" : "clicks"}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
              />
              {i % 7 === 0 && (
                <text x={x} y={CHART_H + 20} fontSize="10" fill="var(--text-muted)">
                  {dayLabel(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
