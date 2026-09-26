import { Link } from "react-router-dom";
import type { BookingStatus, StatusCount } from "@naano/shared";

interface BookingPipelineProps {
  statuses: StatusCount[];
}

const PIPELINE_ORDER: BookingStatus[] = [
  "INVITED",
  "ACCEPTED",
  "DRAFT_READY",
  "SCHEDULED",
  "LIVE",
  "PAID",
];

const LABELS: Record<BookingStatus, string> = {
  INVITED: "Invited",
  ACCEPTED: "Accepted",
  DRAFT_READY: "Draft in review",
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  PAID: "Paid",
  DECLINED: "Declined",
};

// Darkest -> lightest across the six live stages, same color-mix approach as
// ui/SegmentedBar and marketplace/CampaignBudgetBar — one accent token, no
// decorative palette.
const TINTS = [
  "var(--primary)",
  "color-mix(in srgb, var(--primary) 85%, white)",
  "color-mix(in srgb, var(--primary) 68%, white)",
  "color-mix(in srgb, var(--primary) 52%, white)",
  "color-mix(in srgb, var(--primary) 38%, white)",
  "color-mix(in srgb, var(--primary) 24%, white)",
];

// One horizontal bar per BookingStatus, in lifecycle order, count at the end.
// DECLINED is a dead end, not a pipeline stage, so it renders separately
// below, muted, rather than inline with the six live ones.
export function BookingPipeline({ statuses }: BookingPipelineProps): JSX.Element {
  const byStatus = new Map(statuses.map((s) => [s.status, s.count]));
  const live = PIPELINE_ORDER.map((status) => ({ status, count: byStatus.get(status) ?? 0 }));
  const declinedCount = byStatus.get("DECLINED") ?? 0;
  const totalBookings = live.reduce((sum, s) => sum + s.count, 0) + declinedCount;

  if (totalBookings === 0) {
    return (
      <p className="text-body text-text-muted">
        No bookings yet.{" "}
        <Link to="/app" className="font-medium text-primary">
          Invite a creator from the marketplace
        </Link>
        .
      </p>
    );
  }

  const max = Math.max(1, ...live.map((s) => s.count), declinedCount);

  return (
    <div className="flex flex-col gap-s3">
      {live.map((s, i) => (
        <div key={s.status} className="flex items-center gap-s3">
          <span className="w-[112px] shrink-0 text-label text-text-muted">
            {LABELS[s.status]}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full"
              style={{ width: `${(s.count / max) * 100}%`, backgroundColor: TINTS[i] }}
            />
          </div>
          <span className="w-[28px] shrink-0 text-right tabular-nums text-text">
            {s.count}
          </span>
        </div>
      ))}
      {declinedCount > 0 && (
        <div className="mt-s1 flex items-center gap-s3 border-t border-border pt-s3">
          <span className="w-[112px] shrink-0 text-label text-text-muted">
            {LABELS.DECLINED}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(declinedCount / max) * 100}%`,
                backgroundColor: "color-mix(in srgb, var(--text-muted) 45%, white)",
              }}
            />
          </div>
          <span className="w-[28px] shrink-0 text-right tabular-nums text-text-muted">
            {declinedCount}
          </span>
        </div>
      )}
    </div>
  );
}
