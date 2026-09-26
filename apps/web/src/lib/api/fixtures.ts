import { COMMISSION_PCT } from "@naano/shared";
import type {
  ActionCount,
  AttributionResponse,
  AttributionRow,
  AudienceSegment,
  AuthMe,
  Booking,
  BookingSent,
  BookingStatus,
  BrandCollaboration,
  CampaignOverview,
  CampaignSummary,
  CreateBookingBody,
  CreatorCollaboration,
  CreatorEarnings,
  CreatorPost,
  CreatorProfileDetail,
  DemoCreatorResponse,
  ListCreatorsParams,
  LoginResponse,
  MarketplaceCreator,
  NextAction,
  PageParams,
  Paginated,
  UpdateBookingStatusBody,
  UpdateMyCardBody,
} from "@naano/shared";
import type { ApiClient } from "./client";
import { ApiError } from "./errors";

// getDemoCreatorEmail's fixture stand-in. login()/getMe() below always return
// the brand FIXTURE_ME regardless of which email is passed in (fixtures mode
// has no real creator-side session yet), so this email is never actually
// signed into — it only keeps the ApiClient shape honest.
const FIXTURE_CREATOR_EMAIL = "sofia.bergman0@creators.naano.dev";
// updateMyCard's stand-in for "the signed-in creator" — same limitation as
// FIXTURE_CREATOR_EMAIL above, there's no real creator-mode fixture session.
// Sofia Bergman, the creator FIXTURE_CREATOR_EMAIL names.
const FIXTURE_SELF_CREATOR_ID = "fixture-1";
// Keep in sync with apps/api/src/creators/dto/update-my-card.dto.ts.
const MIN_PRICE_CENTS = 5_000;
const MAX_PRICE_CENTS = 2_250_000;

const FIXTURE_ME: AuthMe = {
  userId: "fixture-user-brand",
  email: "growth@ledgerly.example.com",
  role: "COMPANY",
  companyId: "fixture-company-1",
  creatorProfileId: null,
  displayName: "Ledgerly",
};

const FIXTURE_CAMPAIGN: CampaignSummary = {
  id: "fixture-campaign-1",
  name: "Fintech Trust Campaign",
  status: "LIVE",
  targetVertical: "FINTECH",
};

// A second campaign so the W2 switcher/budget bar has something real to
// switch between in fixtures mode. DRAFT, distinct target vertical.
const FIXTURE_CAMPAIGN_2: CampaignSummary = {
  id: "fixture-campaign-2",
  name: "DevTools Outreach",
  status: "DRAFT",
  targetVertical: "DEVTOOLS",
};

const FIXTURE_CAMPAIGNS: CampaignSummary[] = [FIXTURE_CAMPAIGN, FIXTURE_CAMPAIGN_2];

const FIXTURE_BUDGET_CENTS: Record<string, number> = {
  [FIXTURE_CAMPAIGN.id]: 500_000,
  [FIXTURE_CAMPAIGN_2.id]: 300_000,
};

/** Mirrors apps/api/src/campaigns/campaigns.service.ts's COMMITTED_STATUSES. */
const COMMITTED_STATUSES = new Set<BookingStatus>([
  "ACCEPTED",
  "DRAFT_READY",
  "SCHEDULED",
  "LIVE",
  "PAID",
]);

// Per-campaign shortlist, in memory for the session.
const fixtureShortlist = new Map<string, Set<string>>([
  ["fixture-campaign-1", new Set(["fixture-3"])],
]);
function shortlistSet(campaignId: string): Set<string> {
  let set = fixtureShortlist.get(campaignId);
  if (!set) {
    set = new Set();
    fixtureShortlist.set(campaignId, set);
  }
  return set;
}

// In-memory bookings for the session. FIXTURE_ME is always the brand (no
// creator-mode fixture context yet), so listBookingsReceived has nothing to
// return, but creating/listing/updating on the brand side works the same way
// the real API does. Stored as BookingSent plus the two lifecycle fields
// (draftContent/postUrl) neither BookingSent nor Booking carry, so the five
// lifecycle actions below have somewhere to write — createBooking still
// returns it as the Booking the interface promises.
interface FixtureBooking extends BookingSent {
  draftContent: string | null;
  postUrl: string | null;
}
let fixtureBookings: FixtureBooking[] = [];
let fixtureBookingSeq = 0;

// Mirrors apps/api/src/bookings/next-action.ts — fixtures have no server to
// ask, so the same status+viewer+hasDraft table is duplicated here (same
// pattern as SORTERS mirroring ranking.ts). Keep the two in sync by hand.
function fixtureNextAction(
  status: BookingStatus,
  viewer: "CREATOR" | "COMPANY",
  hasDraft: boolean,
): NextAction {
  if (viewer === "CREATOR") {
    switch (status) {
      case "INVITED":
        return {
          kind: "respond",
          label: "Accept or decline this invitation.",
          consequence: "Nothing moves until you respond. The brand's invitation stays pending.",
        };
      case "ACCEPTED":
        return {
          kind: "submit_draft",
          label: hasDraft
            ? "The brand asked for changes. Revise your draft and send it again."
            : "Write your post and send it to the brand for review.",
          consequence: "The brand can't approve anything until your draft arrives.",
        };
      case "DRAFT_READY":
        return { kind: "await_brand", label: "Wait for the brand to review your draft.", consequence: "" };
      case "SCHEDULED":
        return {
          kind: "publish",
          label: "Your draft is approved. Publish it with your tracked link, then add the post URL here.",
          consequence: "The brand can't pay you until the post is live.",
        };
      case "LIVE":
        return { kind: "await_brand", label: "Wait for the brand to confirm payment.", consequence: "" };
      case "PAID":
      case "DECLINED":
        return { kind: "none", label: "Nothing to do.", consequence: "" };
    }
  }
  switch (status) {
    case "INVITED":
      return { kind: "await_creator", label: "Waiting for the creator to accept.", consequence: "" };
    case "ACCEPTED":
      return {
        kind: "await_creator",
        label: hasDraft ? "Waiting for the creator's revised draft." : "Waiting for the creator's draft.",
        consequence: "",
      };
    case "DRAFT_READY":
      return {
        kind: "review_draft",
        label: "Review the draft. Approve it or ask for changes.",
        consequence: "The creator can't publish until you decide.",
      };
    case "SCHEDULED":
      return { kind: "await_creator", label: "Waiting for the creator to publish.", consequence: "" };
    case "LIVE":
      return {
        kind: "mark_paid",
        label: "The post is live. Record that you've paid the creator.",
        consequence: "The creator's earnings stay in transit until you confirm.",
      };
    case "PAID":
    case "DECLINED":
      return { kind: "none", label: "Nothing to do.", consequence: "" };
  }
}

/** What the creator receives after COMMISSION_PCT, rounded to whole cents. Mirrors apps/api/src/bookings/money.ts. */
function fixtureNetCents(agreedPriceCents: number): number {
  return agreedPriceCents - Math.round((agreedPriceCents * COMMISSION_PCT) / 100);
}

function toCreatorCollaboration(booking: FixtureBooking): CreatorCollaboration {
  return {
    id: booking.id,
    campaignId: booking.campaignId,
    creatorProfileId: booking.creatorProfileId,
    agreedPriceCents: booking.agreedPriceCents,
    status: booking.status,
    initiatedBy: booking.initiatedBy,
    deliverable: booking.deliverable,
    deadline: booking.deadline,
    createdAt: booking.createdAt,
    trackedLinkSlug: booking.trackedLinkSlug,
    clickCount: booking.clickCount,
    campaignName: booking.campaignName,
    companyName: FIXTURE_ME.displayName ?? "",
    nextAction: fixtureNextAction(booking.status, "CREATOR", booking.draftContent !== null),
    netCents: fixtureNetCents(booking.agreedPriceCents),
    draftContent: booking.draftContent,
    postUrl: booking.postUrl,
  };
}

function toBrandCollaboration(booking: FixtureBooking): BrandCollaboration {
  return {
    ...booking,
    nextAction: fixtureNextAction(booking.status, "COMPANY", booking.draftContent !== null),
    draftContent: booking.draftContent,
    postUrl: booking.postUrl,
  };
}

function findFixtureBooking(id: string): FixtureBooking {
  const booking = fixtureBookings.find((b) => b.id === id);
  if (!booking) throw new ApiError(404, `No booking "${id}"`);
  return booking;
}

// Static stand-in for the API — the hedge in CLAUDE.md. Same shape as the live
// payload so swapping VITE_API_MODE is the only change. Figures follow the
// calibration in docs/RECON.md §10: median views 20-100% of followers, CPM in
// the EUR 10-30 band, bundle of five ~3.3x a single post. `sectorFitPct` stands in
// for a marketplace ranked against a fintech-leaning campaign.
const FIXTURE_CREATORS: MarketplaceCreator[] = [
  {
    id: "fixture-1",
    userId: "fixture-user-1",
    displayName: "Sofia Bergman",
    headline: "RevOps systems that keep GTM data honest",
    avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    vertical: "REVOPS",
    network: "LINKEDIN",
    followerCount: 42_000,
    country: "SE",
    language: "en",
    postCostCents: 38_000,
    bundle5PriceCents: 125_400,
    medianViews: 19_000,
    observedEngagerCount: 62,
    postsAnalyzed: 22,
    engagementRate: 0.041,
    createdAt: "2026-08-01T09:00:00.000Z",
    sectorFitPct: 38,
  },
  {
    id: "fixture-2",
    userId: "fixture-user-2",
    displayName: "Marco Conti",
    headline: "Writing for developers who hate marketing",
    avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    vertical: "DEVTOOLS",
    network: "X",
    followerCount: 128_000,
    country: "IT",
    language: "it",
    postCostCents: 99_000,
    bundle5PriceCents: 326_700,
    medianViews: 45_000,
    observedEngagerCount: 141,
    postsAnalyzed: 19,
    engagementRate: 0.035,
    createdAt: "2026-08-03T09:00:00.000Z",
    sectorFitPct: 32,
  },
  {
    id: "fixture-3",
    userId: "fixture-user-3",
    displayName: "Amelia Reyes",
    headline: "Fintech and embedded finance, explained simply",
    avatarUrl: "https://randomuser.me/api/portraits/men/67.jpg",
    vertical: "FINTECH",
    network: "LINKEDIN",
    followerCount: 310_000,
    country: "GB",
    language: "en",
    postCostCents: 139_200,
    bundle5PriceCents: 459_360,
    medianViews: 87_000,
    observedEngagerCount: 204,
    postsAnalyzed: 17,
    engagementRate: 0.028,
    createdAt: "2026-08-05T09:00:00.000Z",
    sectorFitPct: 100,
  },
  {
    id: "fixture-4",
    userId: "fixture-user-4",
    displayName: "Nils Andersen",
    headline: "Outbound sales playbooks that actually convert",
    avatarUrl: "https://randomuser.me/api/portraits/men/12.jpg",
    vertical: "SALES",
    network: "LINKEDIN",
    followerCount: 8_500,
    country: "DK",
    language: "en",
    postCostCents: 9_500,
    bundle5PriceCents: 31_350,
    medianViews: 6_800,
    observedEngagerCount: 34,
    postsAnalyzed: 24,
    engagementRate: 0.052,
    createdAt: "2026-08-07T09:00:00.000Z",
    sectorFitPct: 22,
  },
  {
    id: "fixture-5",
    userId: "fixture-user-5",
    displayName: "Ines Moreau",
    headline: "People ops and HR tech for modern teams",
    avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
    vertical: "HR_TECH",
    network: "LINKEDIN",
    followerCount: 61_000,
    country: "FR",
    language: "fr",
    postCostCents: 45_600,
    bundle5PriceCents: 150_480,
    medianViews: 24_000,
    observedEngagerCount: 88,
    postsAnalyzed: 20,
    engagementRate: 0.038,
    createdAt: "2026-08-09T09:00:00.000Z",
    sectorFitPct: 32,
  },
  {
    id: "fixture-6",
    userId: "fixture-user-6",
    displayName: "Erik Larsen",
    headline: "Vertical SaaS go-to-market playbooks",
    avatarUrl: "https://randomuser.me/api/portraits/men/5.jpg",
    vertical: "VERTICAL_SAAS",
    network: "LINKEDIN",
    followerCount: 19_000,
    country: "NL",
    language: "en",
    postCostCents: 17_800,
    bundle5PriceCents: 58_740,
    medianViews: 10_500,
    observedEngagerCount: 47,
    postsAnalyzed: 21,
    engagementRate: 0.044,
    createdAt: "2026-08-11T09:00:00.000Z",
    sectorFitPct: 32,
  },
];

const SORTERS: Record<
  NonNullable<ListCreatorsParams["sort"]>,
  (a: MarketplaceCreator, b: MarketplaceCreator) => number
> = {
  best_match: (a, b) =>
    (b.sectorFitPct ?? 0) - (a.sectorFitPct ?? 0) ||
    a.postCostCents / a.medianViews - b.postCostCents / b.medianViews,
  price_asc: (a, b) => a.postCostCents - b.postCostCents,
  followers_desc: (a, b) => b.followerCount - a.followerCount,
  engagement_desc: (a, b) => b.engagementRate - a.engagementRate,
};

function segmentsFor(detail: CreatorProfileDetail): AudienceSegment[] {
  const spec: Array<[AudienceSegment["dimension"], string[]]> = [
    ["JOB_TITLE", ["Marketing leaders", "Founders & CEOs", "RevOps & Sales Ops", "Product managers"]],
    ["SENIORITY", ["VP", "Director", "Manager", "C-level"]],
    ["INDUSTRY", ["B2B SaaS", "Fintech", "Agencies & consulting", "E-commerce & retail"]],
    ["GEOGRAPHY", [detail.country === "GB" ? "United Kingdom" : "United States", "United Kingdom", "Germany", "Other"]],
  ];
  const pcts = [46, 27, 16, 11];
  return spec.flatMap(([dimension, labels]) =>
    labels.map((label, i) => ({
      id: `${detail.id}-${dimension}-${i}`,
      creatorProfileId: detail.id,
      dimension,
      label,
      percentage: pcts[i]!,
      createdAt: detail.createdAt,
    })),
  );
}

function postsFor(detail: CreatorProfileDetail): CreatorPost[] {
  const base = Date.parse(detail.createdAt);
  return [0, 1, 2].map((i) => ({
    id: `${detail.id}-post-${i}`,
    creatorProfileId: detail.id,
    network: detail.network,
    content:
      i === 0
        ? "A feature nobody would fight to keep is a feature you can delete. We cut four last month and shipped one that moved activation five points."
        : "Short breakdown of how we approached this with the team — full write-up in the link below.",
    publishedAt: new Date(base + i * 3 * 86_400_000).toISOString(),
    views: Math.round(detail.medianViews * (1.2 - i * 0.2)),
    reactions: Math.round(detail.medianViews * 0.03),
    comments: Math.round(detail.medianViews * 0.006),
    reposts: Math.round(detail.medianViews * 0.002),
    externalUrl: "https://www.linkedin.com/",
  }));
}

export const fixturesClient: ApiClient = {
  async login(): Promise<LoginResponse> {
    return { accessToken: "fixture-token" };
  },
  async getMe(): Promise<AuthMe> {
    return FIXTURE_ME;
  },
  async getDemoCreatorEmail(): Promise<DemoCreatorResponse> {
    return { email: FIXTURE_CREATOR_EMAIL };
  },
  async listCreators(params?: ListCreatorsParams): Promise<Paginated<MarketplaceCreator>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const q = params?.q?.trim().toLowerCase();
    const {
      vertical,
      country,
      minFollowers,
      maxFollowers,
      priceMinCents,
      priceMaxCents,
      maxCpmEur,
      minMedianViews,
      minEngagementPct,
    } = params ?? {};

    let rows = [...FIXTURE_CREATORS];
    if (q) {
      rows = rows.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.headline.toLowerCase().includes(q),
      );
    }
    if (vertical && vertical.length > 0) {
      rows = rows.filter((c) => vertical.includes(c.vertical));
    }
    if (country) {
      rows = rows.filter((c) => c.country.toLowerCase() === country.toLowerCase());
    }
    if (minFollowers !== undefined) {
      rows = rows.filter((c) => c.followerCount >= minFollowers);
    }
    if (maxFollowers !== undefined) {
      rows = rows.filter((c) => c.followerCount <= maxFollowers);
    }
    if (priceMinCents !== undefined) {
      rows = rows.filter((c) => c.postCostCents >= priceMinCents);
    }
    if (priceMaxCents !== undefined) {
      rows = rows.filter((c) => c.postCostCents <= priceMaxCents);
    }
    if (maxCpmEur !== undefined) {
      rows = rows.filter((c) => {
        const cpm = (c.postCostCents / c.medianViews) * 1000;
        return cpm === 0 || cpm / 100 <= maxCpmEur;
      });
    }
    if (minMedianViews !== undefined) {
      rows = rows.filter((c) => c.medianViews >= minMedianViews);
    }
    if (minEngagementPct !== undefined) {
      rows = rows.filter((c) => c.engagementRate >= minEngagementPct / 100);
    }
    // postedWithinDays has no fixture equivalent — FIXTURE_CREATORS carries no
    // per-post publish date (posts are only synthesized in getCreator), so the
    // fixture client cannot mirror this filter. Verified against the real API.
    rows.sort(SORTERS[params?.sort ?? "best_match"]);

    const start = (page - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize),
      total: rows.length,
      page,
      pageSize,
    };
  },

  async getCreator(id: string): Promise<CreatorProfileDetail> {
    const creator = FIXTURE_CREATORS.find((c) => c.id === id);
    if (!creator) throw new Error(`fixture creator ${id} not found`);
    const { sectorFitPct: _sectorFitPct, ...profile } = creator;
    const detail: CreatorProfileDetail = {
      ...profile,
      audienceSegments: [],
      posts: [],
    };
    detail.audienceSegments = segmentsFor(detail);
    detail.posts = postsFor(detail);
    return detail;
  },

  // Mirrors apps/api/src/creators/creators.service.ts's updateMyCard
  // validation by hand (same "no real server to ask" reasoning as
  // fixtureNextAction above) — keep in sync if that changes.
  async updateMyCard(body: UpdateMyCardBody): Promise<CreatorProfileDetail> {
    const creator = FIXTURE_CREATORS.find((c) => c.id === FIXTURE_SELF_CREATOR_ID);
    if (!creator) throw new ApiError(404, "No fixture creator profile");
    if (
      body.headline === undefined &&
      body.postCostCents === undefined &&
      body.bundle5PriceCents === undefined
    ) {
      throw new ApiError(400, "Provide at least one field to update.");
    }
    if (body.headline !== undefined) {
      const trimmed = body.headline.trim();
      if (trimmed.length < 1 || trimmed.length > 160) {
        throw new ApiError(400, "headline must be between 1 and 160 characters");
      }
    }
    for (const value of [body.postCostCents, body.bundle5PriceCents]) {
      if (value === undefined) continue;
      if (!Number.isInteger(value) || value < MIN_PRICE_CENTS || value > MAX_PRICE_CENTS) {
        throw new ApiError(
          400,
          `Price must be an integer between ${MIN_PRICE_CENTS} and ${MAX_PRICE_CENTS} cents.`,
        );
      }
    }
    const postCostCents = body.postCostCents ?? creator.postCostCents;
    const bundle5PriceCents = body.bundle5PriceCents ?? creator.bundle5PriceCents;
    if (bundle5PriceCents < postCostCents || bundle5PriceCents > postCostCents * 5) {
      throw new ApiError(
        400,
        "Bundle-of-5 price must be at least the single-post price and at most 5x it.",
      );
    }
    if (body.headline !== undefined) creator.headline = body.headline.trim();
    creator.postCostCents = postCostCents;
    creator.bundle5PriceCents = bundle5PriceCents;
    return fixturesClient.getCreator(creator.id);
  },

  async getActiveCampaign(): Promise<CampaignSummary> {
    return FIXTURE_CAMPAIGN;
  },

  async listShortlist(
    campaignId: string,
    params?: PageParams,
  ): Promise<Paginated<MarketplaceCreator>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const ids = shortlistSet(campaignId);
    const rows = FIXTURE_CREATORS.filter((c) => ids.has(c.id));
    const start = (page - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize),
      total: rows.length,
      page,
      pageSize,
    };
  },

  async addToShortlist(
    campaignId: string,
    creatorProfileId: string,
  ): Promise<MarketplaceCreator> {
    const creator = FIXTURE_CREATORS.find((c) => c.id === creatorProfileId);
    if (!creator) throw new Error(`fixture creator ${creatorProfileId} not found`);
    shortlistSet(campaignId).add(creatorProfileId);
    return creator;
  },

  async removeFromShortlist(
    campaignId: string,
    creatorProfileId: string,
  ): Promise<void> {
    shortlistSet(campaignId).delete(creatorProfileId);
  },

  async createBooking(body: CreateBookingBody): Promise<Booking> {
    const creator = FIXTURE_CREATORS.find((c) => c.id === body.creatorProfileId);
    if (!creator) throw new ApiError(404, `No creator profile "${body.creatorProfileId}"`);

    const campaign = body.campaignId
      ? FIXTURE_CAMPAIGNS.find((c) => c.id === body.campaignId)
      : FIXTURE_CAMPAIGN;
    if (!campaign) throw new ApiError(404, `No campaign "${body.campaignId}"`);
    if (campaign.status === "COMPLETED") {
      throw new ApiError(409, "This campaign is completed, so it can't take new bookings.");
    }

    const existing = fixtureBookings.find(
      (b) =>
        b.campaignId === campaign.id &&
        b.creatorProfileId === creator.id &&
        b.status !== "DECLINED",
    );
    if (existing) {
      throw new ApiError(409, `${creator.displayName} is already booked for this campaign`);
    }

    const booking: FixtureBooking = {
      id: `fixture-booking-${fixtureBookingSeq++}`,
      campaignId: campaign.id,
      creatorProfileId: creator.id,
      agreedPriceCents:
        body.package === "bundle" ? creator.bundle5PriceCents : creator.postCostCents,
      status: "INVITED",
      initiatedBy: "BRAND",
      deliverable: body.deliverable,
      deadline: null,
      createdAt: new Date().toISOString(),
      trackedLinkSlug: null,
      clickCount: null,
      creatorDisplayName: creator.displayName,
      campaignName: campaign.name,
      package: body.package,
      draftContent: null,
      postUrl: null,
    };
    fixtureBookings = [booking, ...fixtureBookings];
    return booking;
  },
  async listCampaigns(params?: PageParams): Promise<Paginated<CampaignOverview>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const items: CampaignOverview[] = FIXTURE_CAMPAIGNS.map((summary) => {
      let pendingCents = 0;
      let committedCents = 0;
      let paidCents = 0;
      let bookingsCount = 0;
      for (const b of fixtureBookings) {
        if (b.campaignId !== summary.id) continue;
        if (b.status === "INVITED") pendingCents += b.agreedPriceCents;
        if (COMMITTED_STATUSES.has(b.status)) committedCents += b.agreedPriceCents;
        if (b.status === "PAID") paidCents += b.agreedPriceCents;
        if (b.status !== "DECLINED") bookingsCount += 1;
      }
      return {
        ...summary,
        budgetCents: FIXTURE_BUDGET_CENTS[summary.id] ?? 0,
        pendingCents,
        committedCents,
        paidCents,
        bookingsCount,
      };
    });
    return { items, total: items.length, page, pageSize };
  },

  async listBookingsReceived(params?: PageParams): Promise<Paginated<CreatorCollaboration>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    return { items: [], total: 0, page, pageSize };
  },

  // FIXTURE_ME is always the brand — no creator-mode fixture context exists
  // yet (same limitation as listBookingsReceived above), so this is an
  // honest zeroed response, not a fabricated one.
  async getEarnings(): Promise<CreatorEarnings> {
    return {
      totalEarnedCents: 0,
      paidCollaborationsCount: 0,
      averageCents: 0,
      inTransitCents: 0,
      monthly: [],
    };
  },

  async listBookingsSent(
    params?: PageParams & { campaignId?: string; status?: BookingStatus },
  ): Promise<Paginated<BrandCollaboration>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    let rows = fixtureBookings;
    if (params?.campaignId) {
      rows = rows.filter((b) => b.campaignId === params.campaignId);
    }
    if (params?.status) {
      rows = rows.filter((b) => b.status === params.status);
    }
    const start = (page - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize).map(toBrandCollaboration),
      total: rows.length,
      page,
      pageSize,
    };
  },

  async updateBookingStatus(
    id: string,
    status: UpdateBookingStatusBody["status"],
  ): Promise<Booking> {
    const booking = findFixtureBooking(id);
    if (booking.status !== "INVITED") {
      throw new ApiError(409, `This booking is already ${booking.status.toLowerCase()}`);
    }
    booking.status = status;
    if (status === "ACCEPTED") {
      booking.trackedLinkSlug = `fixture-${booking.id}`;
      booking.clickCount = 0;
    }
    return booking;
  },

  async submitDraft(id: string, content: string): Promise<CreatorCollaboration> {
    const booking = findFixtureBooking(id);
    if (booking.status !== "ACCEPTED") {
      throw new ApiError(409, `This booking is ${booking.status.toLowerCase()}, so a draft can't be sent.`);
    }
    booking.status = "DRAFT_READY";
    booking.draftContent = content;
    return toCreatorCollaboration(booking);
  },

  async markPublished(id: string, postUrl: string): Promise<CreatorCollaboration> {
    const booking = findFixtureBooking(id);
    if (booking.status !== "SCHEDULED") {
      throw new ApiError(409, `This booking is ${booking.status.toLowerCase()}, so it can't be published.`);
    }
    let url: URL;
    try {
      url = new URL(postUrl);
    } catch {
      throw new ApiError(400, "postUrl must be an https link on linkedin.com, x.com or twitter.com");
    }
    const allowedHosts = new Set(["linkedin.com", "www.linkedin.com", "x.com", "twitter.com"]);
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase())) {
      throw new ApiError(400, "postUrl must be an https link on linkedin.com, x.com or twitter.com");
    }
    booking.status = "LIVE";
    booking.postUrl = postUrl;
    return toCreatorCollaboration(booking);
  },

  async approveDraft(id: string): Promise<BrandCollaboration> {
    const booking = findFixtureBooking(id);
    if (booking.status !== "DRAFT_READY") {
      throw new ApiError(409, `This booking is ${booking.status.toLowerCase()}, so it can't be approved.`);
    }
    booking.status = "SCHEDULED";
    return toBrandCollaboration(booking);
  },

  async requestChanges(id: string): Promise<BrandCollaboration> {
    const booking = findFixtureBooking(id);
    if (booking.status !== "DRAFT_READY") {
      throw new ApiError(409, `This booking is ${booking.status.toLowerCase()}, so it can't be sent back for changes.`);
    }
    booking.status = "ACCEPTED";
    return toBrandCollaboration(booking);
  },

  async markPaid(id: string): Promise<BrandCollaboration> {
    const booking = findFixtureBooking(id);
    if (booking.status !== "LIVE") {
      throw new ApiError(409, `This booking is ${booking.status.toLowerCase()}, so it can't be marked paid.`);
    }
    booking.status = "PAID";
    return toBrandCollaboration(booking);
  },

  // FIXTURE_ME is always the brand (same limitation as listBookingsReceived
  // above), so this counts fixtureBookings' own rows as the COMPANY viewer —
  // no server to ask, same derive-from-nextAction rule the real endpoint uses.
  async getActionCount(): Promise<ActionCount> {
    const count = fixtureBookings.filter(
      (b) => fixtureNextAction(b.status, "COMPANY", b.draftContent !== null).consequence !== "",
    ).length;
    return { count };
  },

  // Fixtures never simulate a real /r/:slug click, so lastClickAt has nothing
  // honest to report and stays null — only totalClicks (from clickCount,
  // always 0 here) and acceptedBookingsCount are real derived numbers.
  async listAttribution(params?: PageParams): Promise<AttributionResponse> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;

    const byCreator = new Map<
      string,
      { displayName: string; bookings: number; clicks: number }
    >();
    for (const booking of fixtureBookings) {
      if (!booking.trackedLinkSlug) continue;
      const existing = byCreator.get(booking.creatorProfileId);
      const clicks = booking.clickCount ?? 0;
      if (existing) {
        existing.bookings += 1;
        existing.clicks += clicks;
      } else {
        byCreator.set(booking.creatorProfileId, {
          displayName: booking.creatorDisplayName,
          bookings: 1,
          clicks,
        });
      }
    }

    const rows: AttributionRow[] = Array.from(byCreator.entries())
      .map(([creatorProfileId, v]) => ({
        creatorProfileId,
        creatorDisplayName: v.displayName,
        acceptedBookingsCount: v.bookings,
        totalClicks: v.clicks,
        lastClickAt: null,
      }))
      .sort(
        (a, b) =>
          b.totalClicks - a.totalClicks ||
          a.creatorDisplayName.localeCompare(b.creatorDisplayName),
      );

    const hasAnyClicks = rows.some((r) => r.totalClicks > 0);
    const start = (page - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize),
      total: rows.length,
      page,
      pageSize,
      hasAnyClicks,
    };
  },
};
