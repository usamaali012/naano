// Shapes for the paginated list envelope every list endpoint returns, plus the
// per-endpoint request/response contracts shared by the API and the web client.

import type { AudienceSegment, Booking, CreatorPost, CreatorProfile } from "./entities";
import type { BookingStatus, CampaignStatus, Role, Vertical } from "./enums";

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

/**
 * GET /auth/demo-creator — a demo affordance for EntryPage's "Continue as a
 * creator" button. Public: carries nothing but a seeded account's email.
 */
export interface DemoCreatorResponse {
  email: string;
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

// --- Bookings ----------------------------------------------------------------

/** The two rail options; the server, not the client, converts this to cents. */
export type BookingPackage = "single" | "bundle";

/**
 * Body of POST /bookings. `agreedPriceCents` is deliberately not accepted from
 * the client — the server derives it from the creator's own postCostCents /
 * bundle5PriceCents so the price can't be tampered with in transit.
 */
export interface CreateBookingBody {
  creatorProfileId: string;
  package: BookingPackage;
  deliverable: string;
}

/** Body of PATCH /bookings/:id/status. Only these two transitions exist yet. */
export interface UpdateBookingStatusBody {
  status: Extract<BookingStatus, "ACCEPTED" | "DECLINED">;
}

/** GET /bookings/received — a booking plus who it is from, for the creator. */
export interface BookingReceived extends Booking {
  campaignName: string;
  companyName: string;
}

/**
 * GET /bookings/sent — a booking plus creator/campaign context, for the
 * brand's Collaborations table. `package` is derived server-side (not a
 * stored column) — see docs/DECISIONS.md.
 */
export interface BookingSent extends Booking {
  creatorDisplayName: string;
  campaignName: string;
  package: BookingPackage;
}

// --- Analytics ---------------------------------------------------------------

/**
 * One row of GET /analytics/attribution — real aggregates over ClickEvent for
 * one creator this brand has an accepted booking with, across every
 * campaign. `acceptedBookingsCount` only counts bookings that reached a
 * TrackedLink (ACCEPTED or later) — invited/declined bookings already live
 * in Collaborations. `lastClickAt` is null until the first click; shown as
 * relative time. `ClickEvent.isLead` is not surfaced here: the only writer of
 * it is the seed's random 6% assignment (see docs/DECISIONS.md), not
 * anything the real `/r/:slug` redirect path sets, so it isn't a real signal
 * yet.
 */
export interface AttributionRow {
  creatorProfileId: string;
  creatorDisplayName: string;
  acceptedBookingsCount: number;
  totalClicks: number;
  lastClickAt: string | null;
}

/**
 * `hasAnyClicks` is computed over the full result set server-side (not just
 * the current page), so an empty later page can't be mistaken for "no clicks
 * yet" — the two need different empty states (see docs/DECISIONS.md).
 */
export interface AttributionResponse extends Paginated<AttributionRow> {
  hasAnyClicks: boolean;
}
