// Shapes for the paginated list envelope every list endpoint returns, plus the
// per-endpoint request/response contracts shared by the API and the web client.

import type { AudienceSegment, CreatorPost, CreatorProfile } from "./entities";
import type { Vertical } from "./enums";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
}

// --- Creators -------------------------------------------------------------

/** The four options in the marketplace "Sort by" control (RECON §4). */
export type CreatorSort =
  | "best_match"
  | "price_asc"
  | "followers_desc"
  | "engagement_desc";

/**
 * Query for GET /creators. Every field is optional; an omitted field is "no
 * constraint". `vertical` is repeatable (`?vertical=SALES&vertical=REVOPS`).
 * Money is integer cents; `maxCpmEur` and `minEngagementPct` are human units
 * (20 = €20 CPM, 3 = 3% engagement). These filters hide creators — matching
 * scores are unaffected — and a creator whose CPM is unknown stays visible
 * regardless of `maxCpmEur`.
 *
 * `q` is a free-text match over name and headline. `campaignId` names the
 * campaign the list is ranked for: it fills in `icpFitPct` on every row and
 * feeds sector fit into `best_match`. Omitted, the API ranks against the most
 * recent live campaign ("Ranked for your company", RECON §4); when no campaign
 * exists at all, `icpFitPct` is null and `best_match` is performance-only.
 */
export interface ListCreatorsParams extends PageParams {
  vertical?: Vertical[];
  country?: string;
  q?: string;
  campaignId?: string;
  priceMinCents?: number;
  priceMaxCents?: number;
  maxCpmEur?: number;
  minMedianViews?: number;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementPct?: number;
  postedWithinDays?: number;
  sort?: CreatorSort;
}

/**
 * A creator row as the marketplace grid renders it: the profile plus its ICP
 * fit against the ranking campaign. `icpFitPct` is 0..100, or null when no
 * campaign is in context. Never stored — computed per request.
 */
export interface MarketplaceCreator extends CreatorProfile {
  icpFitPct: number | null;
}

/** GET /creators/:id — the profile plus everything the creator modal renders. */
export interface CreatorProfileDetail extends CreatorProfile {
  audienceSegments: AudienceSegment[];
  posts: CreatorPost[];
}
