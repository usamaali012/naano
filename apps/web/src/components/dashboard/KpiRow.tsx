import type { ResultsOverview } from "@naano/shared";
import { formatCents } from "../../lib/format";

interface KpiRowProps {
  overview: ResultsOverview;
}

const countFormatter = new Intl.NumberFormat("en-IE");
const spendPerClickFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function formatSpendPerClick(paidCents: number, totalClicksAllTime: number): string {
  if (totalClicksAllTime === 0) return "no clicks yet";
  return spendPerClickFormatter.format(paidCents / totalClicksAllTime / 100);
}

// Four headline numbers, same tile shape as the creator Earnings page
// (grid-cols-2 -> sm:grid-cols-4, tabular-nums so the figures don't jitter).
export function KpiRow({ overview }: KpiRowProps): JSX.Element {
  const tiles: Array<[string, string]> = [
    ["Clicks, last 30 days", countFormatter.format(overview.totalClicks30d)],
    ["Total clicks", countFormatter.format(overview.totalClicksAllTime)],
    ["Committed spend", formatCents(overview.committedCents)],
    [
      "Spend per click",
      formatSpendPerClick(overview.paidCents, overview.totalClicksAllTime),
    ],
  ];

  return (
    <dl className="grid grid-cols-2 gap-s4 rounded-card border border-border bg-surface p-s6 sm:grid-cols-4">
      {tiles.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-s1">
          <dd className="text-metric tabular-nums text-text">{value}</dd>
          <dt className="text-label text-text-muted">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
