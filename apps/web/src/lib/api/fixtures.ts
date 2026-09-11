import type {
  AudienceSegment,
  AuthMe,
  Booking,
  BookingReceived,
  CampaignSummary,
  CreateBookingBody,
  CreatorPost,
  CreatorProfileDetail,
  DemoCreatorResponse,
  ListCreatorsParams,
  LoginResponse,
  MarketplaceCreator,
  PageParams,
  Paginated,
  UpdateBookingStatusBody,
} from "@naano/shared";
import type { ApiClient } from "./client";
import { ApiError } from "./errors";

// getDemoCreatorEmail's fixture stand-in. login()/getMe() below always return
// the brand FIXTURE_ME regardless of which email is passed in (fixtures mode
// has no real creator-side session yet), so this email is never actually
// signed into — it only keeps the ApiClient shape honest.
const FIXTURE_CREATOR_EMAIL = "sofia.bergman0@creators.naano.dev";

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
// the real API does.
let fixtureBookings: Booking[] = [];
let fixtureBookingSeq = 0;

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

    let rows = [...FIXTURE_CREATORS];
    if (q) {
      rows = rows.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.headline.toLowerCase().includes(q),
      );
    }
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

    const existing = fixtureBookings.find(
      (b) =>
        b.campaignId === FIXTURE_CAMPAIGN.id &&
        b.creatorProfileId === creator.id &&
        b.status !== "DECLINED",
    );
    if (existing) {
      throw new ApiError(409, `${creator.displayName} is already booked for this campaign`);
    }

    const booking: Booking = {
      id: `fixture-booking-${fixtureBookingSeq++}`,
      campaignId: FIXTURE_CAMPAIGN.id,
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
    };
    fixtureBookings = [booking, ...fixtureBookings];
    return booking;
  },

  async listBookingsReceived(params?: PageParams): Promise<Paginated<BookingReceived>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    return { items: [], total: 0, page, pageSize };
  },

  async listBookingsSent(
    params?: PageParams & { campaignId?: string },
  ): Promise<Paginated<Booking>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const rows = params?.campaignId
      ? fixtureBookings.filter((b) => b.campaignId === params.campaignId)
      : fixtureBookings;
    const start = (page - 1) * pageSize;
    return { items: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
  },

  async updateBookingStatus(
    id: string,
    status: UpdateBookingStatusBody["status"],
  ): Promise<Booking> {
    const booking = fixtureBookings.find((b) => b.id === id);
    if (!booking) throw new ApiError(404, `No booking "${id}"`);
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
};
