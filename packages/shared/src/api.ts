// Shapes for the paginated list envelope every list endpoint returns, plus the
// per-endpoint request/response contracts shared by the API and the web client.

import type { AudienceSegment, CreatorPost, CreatorProfile } from "./entities";
import type { CampaignStatus, Role, Vertical } from "./enums";

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

// --- Auth ------------------------------------------------------------------

/** POST /auth/login response. */
export interface LoginResponse {
  accessToken: string;
}

/** GET /auth/me — the signed-in user and which side they belong to. */
export interface AuthMe {
  userId: string;
  email: string;
  role: Role;
  companyId: string | null;
  creatorProfileId: string | null;
  /** Company name or creator display name, for the app chrome. */
  displayName: string | null;
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
 * campaign the list is ranked for: it fills in `sectorFitPct` on every row and
 * feeds sector fit into `best_match`. Omitted, the API ranks against the most
 * recent live campaign ("Ranked for your company", RECON §4); when no campaign
 * exists at all, `sectorFitPct` is null and `best_match` is performance-only.
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
 * A creator row as the marketplace grid renders it: the profile plus its
 * sector fit against the ranking campaign — how well the creator's own vertical
 * matches the campaign's target, not anything about their audience.
 * `sectorFitPct` is 0..100, or null when no campaign is in context. Never
 * stored — computed per request.
 */
export interface MarketplaceCreator extends CreatorProfile {
  sectorFitPct: number | null;
}

/** GET /creators/:id — the profile plus everything the creator modal renders. */
export interface CreatorProfileDetail extends CreatorProfile {
  audienceSegments: AudienceSegment[];
  posts: CreatorPost[];
}

// --- Campaigns / shortlist ---------------------------------------------------

/**
 * GET /campaigns/active — the campaign the marketplace is ranked for and the
 * shortlist is keyed to. The most recent live campaign, or the most recent
 * campaign of any status if none are live.
 */
export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  targetVertical: Vertical;
}

/** Body of POST /campaigns/:campaignId/shortlist. */
export interface AddToShortlistBody {
  creatorProfileId: string;
}
