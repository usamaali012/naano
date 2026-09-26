import type { AttributionRow } from "@naano/shared";

interface ClicksByCreatorProps {
  rows: AttributionRow[];
}

// Top creators by clicks, ranked horizontal bars, count at the end. A single
// accent tint, not a graduated one: this is a ranking, not a sequence of
// stages, so there's nothing for a gradient to represent.
export function ClicksByCreator({ rows }: ClicksByCreatorProps): JSX.Element {
  if (rows.length === 0) {
    return (
      <p className="text-body text-text-muted">
        Clicks appear here once a creator&rsquo;s tracked link is used.
      </p>
    );
  }

  const max = Math.max(1, ...rows.map((r) => r.totalClicks));

  return (
    <div className="flex flex-col gap-s3">
      {rows.map((row) => (
        <div key={row.creatorProfileId} className="flex items-center gap-s3">
          <span
            className="w-[120px] shrink-0 truncate text-label text-text-muted"
            title={row.creatorDisplayName}
          >
            {row.creatorDisplayName}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(row.totalClicks / max) * 100}%` }}
            />
          </div>
          <span className="w-[36px] shrink-0 text-right tabular-nums text-text">
            {row.totalClicks}
          </span>
        </div>
      ))}
    </div>
  );
}
