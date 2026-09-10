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
 */
export interface ListCreatorsParams extends PageParams {
  vertical?: Vertical[];
  country?: string;
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

/** GET /creators/:id — the profile plus everything the creator modal renders. */
export interface CreatorProfileDetail extends CreatorProfile {
  audienceSegments: AudienceSegment[];
  posts: CreatorPost[];
}
