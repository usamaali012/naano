import type { CampaignOverview } from "@naano/shared";
import { formatCents } from "../../lib/format";

interface SpendByCampaignProps {
  campaigns: CampaignOverview[];
}

// Darkest -> lightest: paid, committed-but-unpaid, invited. Same three tints
// as marketplace/CampaignBudgetBar, so the two screens read as one system.
const TINTS = [
  "var(--primary)",
  "color-mix(in srgb, var(--primary) 55%, white)",
  "color-mix(in srgb, var(--primary) 28%, white)",
];

// One row per campaign: name, then a segmented bar (paid / committed-but-
// unpaid / invited) against its budget, capped visually at 100% the same way
// CampaignBudgetBar caps its own single-campaign version.
export function SpendByCampaign({ campaigns }: SpendByCampaignProps): JSX.Element {
  if (campaigns.length === 0) {
    return <p className="text-body text-text-muted">No campaigns yet.</p>;
  }

  return (
    <div className="flex flex-col gap-s4">
      {campaigns.map((c) => {
        const pct = (cents: number): number =>
          c.budgetCents > 0 ? (cents / c.budgetCents) * 100 : 0;
        const paidWidth = Math.min(100, pct(c.paidCents));
        const committedNotPaidCents = Math.max(0, c.committedCents - c.paidCents);
        const committedWidth = Math.max(
          0,
          Math.min(100 - paidWidth, pct(committedNotPaidCents)),
        );
        const pendingWidth = Math.max(
          0,
          Math.min(100 - paidWidth - committedWidth, pct(c.pendingCents)),
        );
        return (
          <div key={c.id} className="flex flex-col gap-s2">
            <div className="flex items-baseline justify-between gap-s3">
              <span className="truncate text-body font-medium text-text">{c.name}</span>
              <span className="shrink-0 text-label tabular-nums text-text-muted">
                {formatCents(c.committedCents)} of {formatCents(c.budgetCents)}
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-bg">
              {paidWidth > 0 && (
                <div style={{ width: `${paidWidth}%`, backgroundColor: TINTS[0] }} />
              )}
              {committedWidth > 0 && (
                <div style={{ width: `${committedWidth}%`, backgroundColor: TINTS[1] }} />
              )}
              {pendingWidth > 0 && (
                <div style={{ width: `${pendingWidth}%`, backgroundColor: TINTS[2] }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
