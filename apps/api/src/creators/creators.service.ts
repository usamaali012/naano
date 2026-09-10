import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreatorProfile, Paginated } from "@naano/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  scoreAudienceFit,
  type AudienceFitCampaign,
} from "./audience-fit";

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page: number, pageSize: number): Promise<Paginated<CreatorProfile>> {
    const [rows, total] = await Promise.all([
      this.prisma.creatorProfile.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.creatorProfile.count(),
    ]);

    const items: CreatorProfile[] = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      displayName: row.displayName,
      headline: row.headline,
      avatarUrl: row.avatarUrl,
      vertical: row.vertical,
      followerCount: row.followerCount,
      country: row.country,
      language: row.language,
      pricePerPostCents: row.pricePerPostCents,
      avgImpressions: row.avgImpressions,
      engagementRate: row.engagementRate,
      createdAt: row.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize };
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
