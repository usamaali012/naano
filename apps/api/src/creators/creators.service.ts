import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Vertical } from "@prisma/client";
import type {
  AudienceSegment as PrismaAudienceSegment,
  CreatorPost as PrismaCreatorPost,
  CreatorProfile as PrismaCreatorProfile,
} from "@prisma/client";
import type {
  AudienceSegment,
  CreatorPost,
  CreatorProfile,
  CreatorProfileDetail,
  CreatorSort,
  ListCreatorsParams,
  MarketplaceCreator,
  Paginated,
} from "@naano/shared";
import { cpmEur } from "@naano/shared";
import { PrismaService } from "../prisma/prisma.service";
import { bestMatchOrder } from "./ranking";
import { scoreAudienceFit, type AudienceFitCampaign } from "./audience-fit";

const DEFAULT_PAGE_SIZE = 20;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** A gte/lte pair from an optional min/max, or undefined when neither is set. */
function range(min?: number, max?: number): Prisma.IntFilter | undefined {
  if (min == null && max == null) return undefined;
  const filter: Prisma.IntFilter = {};
  if (min != null) filter.gte = min;
  if (max != null) filter.lte = max;
  return filter;
}

function toCreatorProfile(row: PrismaCreatorProfile): CreatorProfile {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    headline: row.headline,
    avatarUrl: row.avatarUrl,
    vertical: row.vertical,
    network: row.network,
    followerCount: row.followerCount,
    country: row.country,
    language: row.language,
    postCostCents: row.postCostCents,
    bundle5PriceCents: row.bundle5PriceCents,
    medianViews: row.medianViews,
    observedEngagerCount: row.observedEngagerCount,
    postsAnalyzed: row.postsAnalyzed,
    engagementRate: row.engagementRate,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAudienceSegment(row: PrismaAudienceSegment): AudienceSegment {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId,
    dimension: row.dimension,
    label: row.label,
    percentage: row.percentage,
    createdAt: row.createdAt.toISOString(),
  };
}

function toCreatorPost(row: PrismaCreatorPost): CreatorPost {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId,
    network: row.network,
    content: row.content,
    publishedAt: row.publishedAt.toISOString(),
    views: row.views,
    reactions: row.reactions,
    comments: row.comments,
    reposts: row.reposts,
    externalUrl: row.externalUrl,
  };
}

// Comparators for the stored-column sorts. best_match is handled separately
// because it ranks over the whole filtered set, not row-by-row.
const COLUMN_SORTS: Record<
  Exclude<CreatorSort, "best_match">,
  (a: PrismaCreatorProfile, b: PrismaCreatorProfile) => number
> = {
  price_asc: (a, b) => a.postCostCents - b.postCostCents,
  followers_desc: (a, b) => b.followerCount - a.followerCount,
  engagement_desc: (a, b) => b.engagementRate - a.engagementRate,
};

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListCreatorsParams): Promise<Paginated<MarketplaceCreator>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const sort: CreatorSort = params.sort ?? "best_match";

    const q = params.q?.trim();
    const where: Prisma.CreatorProfileWhereInput = {
      vertical: params.vertical?.length
        ? { in: params.vertical as Vertical[] }
        : undefined,
      country: params.country,
      OR: q
        ? [
            { displayName: { contains: q, mode: "insensitive" } },
            { headline: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
      postCostCents: range(params.priceMinCents, params.priceMaxCents),
      followerCount: range(params.minFollowers, params.maxFollowers),
      medianViews:
        params.minMedianViews != null ? { gte: params.minMedianViews } : undefined,
      engagementRate:
        params.minEngagementPct != null
          ? { gte: params.minEngagementPct / 100 }
          : undefined,
      posts:
        params.postedWithinDays != null
          ? { some: { publishedAt: { gte: daysAgo(params.postedWithinDays) } } }
          : undefined,
    };

    // CPM is derived, never stored, so the max-CPM filter and the best-match
    // blend both need the full filtered set in hand. The catalogue is ~40 rows;
    // fetch it, refine in memory, then page the array.
    let rows = await this.prisma.creatorProfile.findMany({ where });

    if (params.maxCpmEur != null) {
      const max = params.maxCpmEur;
      rows = rows.filter((row) => {
        const cpm = cpmEur(row.postCostCents, row.medianViews);
        return cpm === 0 || cpm <= max; // unknown CPM stays visible (RECON §4)
      });
    }

    // The list is "Ranked for your company" (RECON §4): sector fit against the
    // campaign in context. An explicit campaignId wins; otherwise the most
    // recent live campaign stands in for the brand's active target. With no
    // campaign at all, fit is unknown and best_match stays performance-only.
    const targetVertical = await this.resolveTargetVertical(params.campaignId);
    const fitById = targetVertical
      ? new Map(
          rows.map((row) => [
            row.id,
            scoreAudienceFit(row, { targetVertical }),
          ]),
        )
      : undefined;

    if (sort === "best_match") {
      const position = new Map(
        bestMatchOrder(rows, fitById).map((id, i) => [id, i]),
      );
      rows.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
    } else {
      const compare = COLUMN_SORTS[sort];
      rows.sort((a, b) => compare(a, b) || (a.id < b.id ? -1 : 1));
    }

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const items: MarketplaceCreator[] = rows
      .slice(start, start + pageSize)
      .map((row) => ({
        ...toCreatorProfile(row),
        icpFitPct: fitById?.get(row.id) ?? null,
      }));

    return { items, total, page, pageSize };
  }

  /**
   * The buyer vertical the marketplace ranks against. An explicit `campaignId`
   * must exist (404 otherwise); with none supplied, fall back to the most
   * recent live campaign, and to null when the brand has no campaigns yet.
   */
  private async resolveTargetVertical(
    campaignId?: string,
  ): Promise<Vertical | null> {
    if (campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { targetVertical: true },
      });
      if (!campaign) {
        throw new NotFoundException(`No campaign "${campaignId}"`);
      }
      return campaign.targetVertical;
    }
    const active = await this.prisma.campaign.findFirst({
      where: { status: "LIVE" },
      orderBy: { createdAt: "desc" },
      select: { targetVertical: true },
    });
    return active?.targetVertical ?? null;
  }

  async detail(id: string): Promise<CreatorProfileDetail> {
    const row = await this.prisma.creatorProfile.findUnique({
      where: { id },
      include: {
        audienceSegments: {
          orderBy: [{ dimension: "asc" }, { percentage: "desc" }],
        },
        posts: { orderBy: { publishedAt: "desc" } },
      },
    });
    if (!row) {
      throw new NotFoundException(`No creator profile "${id}"`);
    }
    return {
      ...toCreatorProfile(row),
      audienceSegments: row.audienceSegments.map(toAudienceSegment),
      posts: row.posts.map(toCreatorPost),
    };
  }

  /**
   * Audience fit for one creator against one campaign's target buyer.
   * Nothing calls this yet; it exists so the marketplace can surface a
   * per-campaign fit score once the campaign flow lands. The scoring rule
   * itself lives behind `scoreAudienceFit` and can be swapped without
   * touching this method or its callers.
   */
  async audienceFitScore(
    creatorProfileId: string,
    campaign: AudienceFitCampaign,
  ): Promise<number> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { vertical: true, followerCount: true },
    });
    if (!creator) {
      throw new NotFoundException(`No creator profile "${creatorProfileId}"`);
    }
    return scoreAudienceFit(creator, campaign);
  }
}
