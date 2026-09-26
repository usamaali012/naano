import type { CampaignOverview } from "@naano/shared";
import { Card } from "../ui/Card";
import { formatCents } from "../../lib/format";

interface CampaignBudgetBarProps {
  campaign: CampaignOverview;
}

// Darkest -> lightest, same color-mix approach as ui/SegmentedBar: one accent
// token, no decorative palette.
const TINTS = [
  "var(--primary)",
  "color-mix(in srgb, var(--primary) 55%, white)",
  "color-mix(in srgb, var(--primary) 28%, white)",
];

// Paid, committed-but-unpaid, and pending (invited) against budget, for the
// campaign the marketplace is currently ranked for. The bar itself caps at
// 100% of budget; going over shows as a warning line below rather than a
// segment that overflows the track.
export function CampaignBudgetBar({ campaign }: CampaignBudgetBarProps): JSX.Element {
  const { budgetCents, committedCents, pendingCents, paidCents } = campaign;

  const pct = (cents: number): number => (budgetCents > 0 ? (cents / budgetCents) * 100 : 0);

  const paidWidth = Math.min(100, pct(paidCents));
  const committedNotPaidCents = Math.max(0, committedCents - paidCents);
  const committedWidth = Math.max(0, Math.min(100 - paidWidth, pct(committedNotPaidCents)));
  const pendingWidth = Math.max(
    0,
    Math.min(100 - paidWidth - committedWidth, pct(pendingCents)),
  );

  const overBudgetCents = Math.max(0, committedCents + pendingCents - budgetCents);

  return (
    <Card className="flex flex-col gap-s3">
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
      <div className="flex flex-wrap items-center justify-between gap-s3 text-label text-text-muted">
        <span className="tabular-nums">
          {formatCents(committedCents)} committed of {formatCents(budgetCents)}
        </span>
        <span className="tabular-nums">
          {formatCents(pendingCents)} invited, not yet accepted
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-s4 text-label text-text-muted">
        <span className="flex items-center gap-s2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: TINTS[0] }}
            aria-hidden="true"
          />
          <span className="tabular-nums">Paid {formatCents(paidCents)}</span>
        </span>
        <span className="flex items-center gap-s2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: TINTS[1] }}
            aria-hidden="true"
          />
          <span className="tabular-nums">
            Committed {formatCents(committedNotPaidCents)}
          </span>
        </span>
        <span className="flex items-center gap-s2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: TINTS[2] }}
            aria-hidden="true"
          />
          <span className="tabular-nums">Invited {formatCents(pendingCents)}</span>
        </span>
      </div>
      {overBudgetCents > 0 && (
        <p className="text-label text-warn">
          {formatCents(overBudgetCents)} over budget.
        </p>
      )}
    </Card>
  );
}
