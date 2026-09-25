import type { EarningsMonth } from "@naano/shared";

interface EarningsChartProps {
  months: EarningsMonth[];
}

const W = 280;
const H = 110;
const BAR_AREA_H = 76;
const GAP = 8;

function monthLabel(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year!, (month ?? 1) - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
  });
}

// Six months of net earnings, oldest to newest, as a token-only inline SVG
// bar chart — no axes or grid, same restraint as ReachSparkline, no charting
// dependency. The current (newest) month is solid; the rest a lighter tint
// mixed from the same token, so the chart reads as "here's now, here's the
// run-up to it" rather than six equal bars.
export function EarningsChart({ months }: EarningsChartProps): JSX.Element {
  if (months.length === 0) {
    return (
      <p className="text-label text-text-muted">No monthly history yet.</p>
    );
  }

  const max = Math.max(1, ...months.map((m) => m.netCents));
  const barWidth = (W - GAP * (months.length - 1)) / months.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-[420px]"
      role="img"
      aria-label={`Net earnings by month, oldest to newest, ${months
        .map((m) => `${monthLabel(m.month)} ${m.netCents}`)
        .join(", ")}`}
    >
      {months.map((m, i) => {
        const x = i * (barWidth + GAP);
        const barH = Math.max(3, (m.netCents / max) * BAR_AREA_H);
        const y = BAR_AREA_H - barH;
        const current = i === months.length - 1;
        return (
          <g key={m.month}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx="3"
              fill={
                current
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 28%, white)"
              }
            />
            <text
              x={x + barWidth / 2}
              y={BAR_AREA_H + 20}
              textAnchor="middle"
              fontSize="10"
              stroke="none"
              fill="var(--text-muted)"
            >
              {monthLabel(m.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
