import { cpmCents } from "@naano/shared";

// "Best match" order for the marketplace. RECON §4 describes the ranking as
// sector fit first, then "verified performance statistics to refine the order".
// Sector fit needs a campaign's target buyer, which the schema does not carry
// yet (the campaign flow is still stubbed), so today this is the performance
// half only: a blend of three verified signals, each rank-normalised across the
// candidate set so their different scales compare fairly. When Campaign grows a
// target vertical, layer `scoreAudienceFit` on top of this — callers here do
// not change.

export interface RankableCreator {
  id: string;
  postCostCents: number;
  medianViews: number;
  engagementRate: number;
}

const WEIGHTS = { cpm: 0.5, medianViews: 0.3, engagement: 0.2 } as const;

/**
 * Position of each creator on `value`, scaled to 0..1 across the set. When
 * `higherIsBetter` the largest value scores 1; otherwise the smallest does. A
 * single-element set scores 1.
 */
function percentileRanks(
  creators: RankableCreator[],
  value: (c: RankableCreator) => number,
  higherIsBetter: boolean,
): Map<string, number> {
  const sorted = [...creators].sort((a, b) =>
    higherIsBetter ? value(a) - value(b) : value(b) - value(a),
  );
  const n = sorted.length;
  const ranks = new Map<string, number>();
  sorted.forEach((c, i) => ranks.set(c.id, n <= 1 ? 1 : i / (n - 1)));
  return ranks;
}

/**
 * Creator ids ordered best-first. Cheaper CPM, higher verified median views and
 * higher engagement all rank a creator up. An unknown CPM (no median views)
 * sorts to the bottom of the CPM component rather than being dropped.
 * Deterministic: equal blended scores break on id.
 */
export function bestMatchOrder(creators: RankableCreator[]): string[] {
  const cpm = percentileRanks(
    creators,
    (c) => cpmCents(c.postCostCents, c.medianViews) || Number.MAX_SAFE_INTEGER,
    false,
  );
  const views = percentileRanks(creators, (c) => c.medianViews, true);
  const engagement = percentileRanks(creators, (c) => c.engagementRate, true);

  return [...creators]
    .map((c) => ({
      id: c.id,
      score:
        WEIGHTS.cpm * (cpm.get(c.id) ?? 0) +
        WEIGHTS.medianViews * (views.get(c.id) ?? 0) +
        WEIGHTS.engagement * (engagement.get(c.id) ?? 0),
    }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1))
    .map((entry) => entry.id);
}
