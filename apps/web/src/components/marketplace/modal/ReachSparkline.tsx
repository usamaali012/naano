import type { CreatorPost } from "@naano/shared";
import { formatCompactNumber } from "../../../lib/format";

interface ReachSparklineProps {
  posts: CreatorPost[];
}

const W = 260;
const H = 72;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// Views across the creator's recent posts, oldest to newest. One flat accent
// line + dots, no axes or grid — it reads at a glance, not for exact values.
export function ReachSparkline({ posts }: ReachSparklineProps): JSX.Element {
  const series = [...posts]
    .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
    .map((post) => ({ views: post.views, at: post.publishedAt }));

  if (series.length < 2) {
    return (
      <p className="text-label text-text-muted">Not enough recent posts to chart.</p>
    );
  }

  const values = series.map((point) => point.views);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = W / (series.length - 1);

  const points = series.map((point, i) => {
    const x = i * stepX;
    const y = H - 6 - ((point.views - min) / span) * (H - 12);
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="flex flex-col gap-s2">
      <div className="flex items-baseline justify-between text-label text-text-muted">
        <span>Reach across recent posts</span>
        <span>Oldest to newest</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Views per recent post, ${formatCompactNumber(min)} to ${formatCompactNumber(max)}`}
      >
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="1.5" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="var(--primary)" />
        ))}
      </svg>
      <div className="flex justify-between text-label text-text-muted">
        <span>{shortDate(series[0]!.at)}</span>
        <span>{shortDate(series[series.length - 1]!.at)}</span>
      </div>
    </div>
  );
}
