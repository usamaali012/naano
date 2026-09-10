import { cpmCents } from "@naano/shared";

// "Best match" order for the marketplace. RECON §4 describes the ranking as
// sector fit first, then "verified performance statistics to refine the order".
//
// Sector fit needs a campaign's target buyer. When the caller passes a
// `fitById` map (0..100 per creator, from `scoreAudienceFit`), it is the
// primary key — creators are grouped by fit, highest first — and the verified
// performance blend only orders creators *within* the same fit band, never
// across bands. With no map — no campaign in context — the performance blend is
// the whole ranking. Each performance signal is rank-normalised across the
// candidate set so the different scales compare fairly.

export interface RankableCreator {
  id: string;
  postCostCents: number;
  medianViews: number;
  engagementRate: number;
}

// The performance blend, used on its own with no campaign and as the
// within-band tie-breaker with one.
const PERF_WEIGHTS = { cpm: 0.5, medianViews: 0.3, engagement: 0.2 } as const;

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
 * Creator ids ordered best-first. When `fitById` is given, creators sort by ICP
 * fit band first (higher first); the performance blend then orders creators
 * within a band. With no map, the performance blend is the whole ranking:
 * cheaper CPM, higher verified median views and higher engagement all rank a
 * creator up. An unknown CPM (no median views) sorts to the bottom of the CPM
 * component rather than being dropped. Deterministic: full ties break on id.
 */
export function bestMatchOrder(
  creators: RankableCreator[],
  fitById?: Map<string, number>,
): string[] {
  const cpm = percentileRanks(
    creators,
    (c) => cpmCents(c.postCostCents, c.medianViews) || Number.MAX_SAFE_INTEGER,
    false,
  );
  const views = percentileRanks(creators, (c) => c.medianViews, true);
  const engagement = percentileRanks(creators, (c) => c.engagementRate, true);

  const perfScore = (c: RankableCreator): number =>
    PERF_WEIGHTS.cpm * (cpm.get(c.id) ?? 0) +
    PERF_WEIGHTS.medianViews * (views.get(c.id) ?? 0) +
    PERF_WEIGHTS.engagement * (engagement.get(c.id) ?? 0);

  return [...creators]
    .map((c) => ({
      id: c.id,
      fit: fitById ? (fitById.get(c.id) ?? 0) : 0,
      perf: perfScore(c),
    }))
    .sort(
      (a, b) =>
        b.fit - a.fit || b.perf - a.perf || (a.id < b.id ? -1 : 1),
    )
    .map((entry) => entry.id);
}
