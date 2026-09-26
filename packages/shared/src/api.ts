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

/**
 * Body of PATCH /creators/me (CREATOR). Every field optional; at least one
 * required. Returns CreatorProfileDetail. Existing bookings keep their
 * agreedPriceCents; a new price only affects bookings made after it.
 */
export interface UpdateMyCardBody {
  /** 1..160 chars, trimmed. */
  headline?: string;
  /** Integer, 5_000..2_250_000. */
  postCostCents?: number;
  /** Integer, >= postCostCents and <= 5 * postCostCents (after applying both fields). */
  bundle5PriceCents?: number;
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

/**
 * One row of GET /campaigns (COMPANY): the signed-in company's own campaigns,
 * with money against budget. Ordering: LIVE first, then DRAFT, then
 * COMPLETED, newest first within each. Paginated.
 */
export interface CampaignOverview extends CampaignSummary {
  budgetCents: number;
  /** sum of agreedPriceCents, INVITED. */
  pendingCents: number;
  /** sum of agreedPriceCents, ACCEPTED through PAID. */
  committedCents: number;
  /** PAID only, a subset of committedCents. */
  paidCents: number;
  /** non-declined bookings. */
  bookingsCount: number;
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
  /**
   * Must belong to the signed-in company (404 otherwise); a COMPLETED
   * campaign is 409. Omitted means the active campaign, exactly as today.
   */
  campaignId?: string;
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

/**
 * GET /bookings/sent now returns Paginated<BrandCollaboration>, a superset
 * of BookingSent, so existing callers keep compiling.
 */
export interface BrandCollaboration extends BookingSent {
  /** Computed for the brand as viewer. */
  nextAction: NextAction;
  draftContent: string | null;
  postUrl: string | null;
}

/**
 * Five lifecycle endpoints. Wrong state is 409, wrong role is 403, someone
 * else's booking is 404.
 *
 * POST /bookings/:id/draft            CREATOR  ACCEPTED -> DRAFT_READY   returns CreatorCollaboration
 * POST /bookings/:id/publish          CREATOR  SCHEDULED -> LIVE         returns CreatorCollaboration
 * POST /bookings/:id/approve          COMPANY  DRAFT_READY -> SCHEDULED  returns BrandCollaboration
 * POST /bookings/:id/request-changes  COMPANY  DRAFT_READY -> ACCEPTED   returns BrandCollaboration
 * POST /bookings/:id/mark-paid        COMPANY  LIVE -> PAID              returns BrandCollaboration
 */
export interface SubmitDraftBody {
  /** 1..3000 chars, trimmed. */
  content: string;
}

/** https URL on linkedin.com, x.com or twitter.com. */
export interface MarkPublishedBody {
  postUrl: string;
}

/**
 * GET /bookings/action-count, either role: how many bookings are waiting on
 * the signed-in user. Counts rows whose nextAction.consequence is non-empty
 * for that viewer.
 */
export interface ActionCount {
  count: number;
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

/** One day of the Results dashboard's clicks chart. */
export interface ClicksDay {
  /** YYYY-MM-DD, UTC. */
  date: string;
  clicks: number;
}

/** One status of the Results dashboard's booking breakdown. */
export interface StatusCount {
  status: BookingStatus;
  count: number;
}

/**
 * GET /analytics/overview (COMPANY-only) — real aggregates for the Results
 * dashboard, scoped to the signed-in company's own campaigns.
 */
export interface ResultsOverview {
  /** Last 30 days including today, zero-filled, oldest first. */
  clicksByDay: ClicksDay[];
  totalClicks30d: number;
  totalClicksAllTime: number;
  /** Every BookingStatus, zero-filled, in lifecycle order. */
  bookingsByStatus: StatusCount[];
  /** Sum of agreedPriceCents on PAID bookings. */
  paidCents: number;
  /** Sum of agreedPriceCents, ACCEPTED through PAID. */
  committedCents: number;
}

// --- Creator side ------------------------------------------------------------
//
// These types are the contract between the API session and the web session.
// They were agreed before either started so neither blocks on the other: the
// API builds them, the web app builds against them (through the fixture client
// first if the endpoints are not live yet). Do not change a shape here without
// telling the other session.

/**
 * naano's cut, as a whole percentage. The real product shows a creator their
 * net and a brand their gross, so there is a commission between the two, but
 * it never states the rate. A flat rate is the honest placeholder: it is one
 * constant, it is named, and it is not presented as naano's real number.
 */
export const COMMISSION_PCT = 20;

/**
 * What the creator should do next with a booking. Derived from status, never
 * stored. naano surfaces this as column six of a table; here it is the
 * organising idea of the creator's screen, which is the product decision.
 */
export interface NextAction {
  /** Machine key, so the UI can render the right control. */
  kind:
    | "respond" // INVITED: viewer must accept or decline.
    | "submit_draft" // ACCEPTED: creator must submit a draft.
    | "publish" // SCHEDULED: creator must publish the live post.
    | "review_draft" // DRAFT_READY: brand must approve or request changes.
    | "mark_paid" // LIVE: brand must mark the booking paid.
    | "await_brand" // Creator is waiting on the brand's next move.
    | "await_creator" // Brand is waiting on the creator's next move.
    | "none"; // Nothing pending for this viewer.
  /** Imperative, addressed to whichever role is viewing. "Accept or decline." */
  label: string;
  /** What happens if they do nothing. Empty string when nothing is pending. */
  consequence: string;
}

/** GET /bookings/received — one row of the creator's Collaborations screen. */
export interface CreatorCollaboration extends BookingReceived {
  /** Derived per row, never stored. */
  nextAction: NextAction;
  /** What the creator receives after COMMISSION_PCT. */
  netCents: number;
  /** The draft the creator submitted (Post.content), or null before one exists. */
  draftContent: string | null;
  /** The published post URL, or null until the creator marks it live. */
  postUrl: string | null;
}

/** One month of the creator's earnings chart, oldest first. */
export interface EarningsMonth {
  /** ISO year-month, e.g. "2026-09". */
  month: string;
  netCents: number;
}

/**
 * GET /bookings/earnings — the creator's money in one response.
 * Deliberately has no "available to withdraw": payment rails are cut, and a
 * balance you cannot withdraw is a control that does nothing.
 */
export interface CreatorEarnings {
  /** PAID bookings only, net of commission. */
  totalEarnedCents: number;
  paidCollaborationsCount: number;
  /** totalEarnedCents / paidCollaborationsCount, or 0 when there are none. */
  averageCents: number;
  /** ACCEPTED through LIVE: agreed, not yet paid. Net of commission. */
  inTransitCents: number;
  /** Six months, oldest first, including the current one. */
  monthly: EarningsMonth[];
}
