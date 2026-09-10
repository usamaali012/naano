import type {
  AudienceSegment,
  CreatorPost,
  CreatorProfileDetail,
  ListCreatorsParams,
  MarketplaceCreator,
  Paginated,
} from "@naano/shared";
import type { ApiClient } from "./client";

// Static stand-in for the API — the hedge in CLAUDE.md. Same shape as the live
// payload so swapping VITE_API_MODE is the only change. Figures follow the
// calibration in docs/RECON.md §10: median views 20-100% of followers, CPM in
// the EUR 10-30 band, bundle of five ~3.3x a single post. `icpFitPct` stands in
// for a marketplace ranked against a fintech-leaning campaign.
const FIXTURE_CREATORS: MarketplaceCreator[] = [
  {
    id: "fixture-1",
    userId: "fixture-user-1",
    displayName: "Sofia Bergman",
    headline: "RevOps systems that keep GTM data honest",
    avatarUrl: null,
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
    icpFitPct: 38,
  },
  {
    id: "fixture-2",
    userId: "fixture-user-2",
    displayName: "Marco Conti",
    headline: "Writing for developers who hate marketing",
    avatarUrl: null,
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
    icpFitPct: 32,
  },
  {
    id: "fixture-3",
    userId: "fixture-user-3",
    displayName: "Amelia Reyes",
    headline: "Fintech and embedded finance, explained simply",
    avatarUrl: null,
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
    icpFitPct: 100,
  },
  {
    id: "fixture-4",
    userId: "fixture-user-4",
    displayName: "Nils Andersen",
    headline: "Outbound sales playbooks that actually convert",
    avatarUrl: null,
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
    icpFitPct: 22,
  },
  {
    id: "fixture-5",
    userId: "fixture-user-5",
    displayName: "Ines Moreau",
    headline: "People ops and HR tech for modern teams",
    avatarUrl: null,
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
    icpFitPct: 32,
  },
  {
    id: "fixture-6",
    userId: "fixture-user-6",
    displayName: "Erik Larsen",
    headline: "Vertical SaaS go-to-market playbooks",
    avatarUrl: null,
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
    icpFitPct: 32,
  },
];

const SORTERS: Record<
  NonNullable<ListCreatorsParams["sort"]>,
  (a: MarketplaceCreator, b: MarketplaceCreator) => number
> = {
  best_match: (a, b) =>
    (b.icpFitPct ?? 0) - (a.icpFitPct ?? 0) ||
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
    const { icpFitPct: _icpFitPct, ...profile } = creator;
    const detail: CreatorProfileDetail = {
      ...profile,
      audienceSegments: [],
      posts: [],
    };
    detail.audienceSegments = segmentsFor(detail);
    detail.posts = postsFor(detail);
    return detail;
  },
};
