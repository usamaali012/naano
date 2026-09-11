import type { CreatorProfile as PrismaCreatorProfile } from "@prisma/client";
import type { CreatorProfile, MarketplaceCreator } from "@naano/shared";

/** Prisma row -> wire-safe CreatorProfile (dates as ISO strings). */
export function toCreatorProfile(row: PrismaCreatorProfile): CreatorProfile {
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

/** A CreatorProfile plus its sector fit against the campaign in context. */
export function toMarketplaceCreator(
  row: PrismaCreatorProfile,
  sectorFitPct: number | null,
): MarketplaceCreator {
  return { ...toCreatorProfile(row), sectorFitPct };
}
