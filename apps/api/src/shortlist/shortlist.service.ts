import { Injectable, NotFoundException } from "@nestjs/common";
import type { MarketplaceCreator, Paginated } from "@naano/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { toMarketplaceCreator } from "../creators/mappers";
import { scoreAudienceFit } from "../creators/audience-fit";

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ShortlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaigns: CampaignsService,
  ) {}

  /** Creators shortlisted for one campaign, newest first, with ICP fit. */
  async list(
    campaignId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<Paginated<MarketplaceCreator>> {
    const campaign = await this.campaigns.assertExists(campaignId);

    const [rows, total] = await Promise.all([
      this.prisma.shortlistItem.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { creatorProfile: true },
      }),
      this.prisma.shortlistItem.count({ where: { campaignId } }),
    ]);

    const items = rows.map((row) =>
      toMarketplaceCreator(
        row.creatorProfile,
        scoreAudienceFit(row.creatorProfile, {
          targetVertical: campaign.targetVertical,
        }),
      ),
    );

    return { items, total, page, pageSize };
  }

  /** Add a creator to a campaign's shortlist. Idempotent. */
  async add(campaignId: string, creatorProfileId: string): Promise<MarketplaceCreator> {
    const campaign = await this.campaigns.assertExists(campaignId);
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
    });
    if (!creator) {
      throw new NotFoundException(`No creator profile "${creatorProfileId}"`);
    }

    await this.prisma.shortlistItem.upsert({
      where: { campaignId_creatorProfileId: { campaignId, creatorProfileId } },
      create: { campaignId, creatorProfileId },
      update: {},
    });

    return toMarketplaceCreator(
      creator,
      scoreAudienceFit(creator, { targetVertical: campaign.targetVertical }),
    );
  }

  /** Remove a creator from a campaign's shortlist. No-op if it was not on it. */
  async remove(campaignId: string, creatorProfileId: string): Promise<void> {
    await this.campaigns.assertExists(campaignId);
    await this.prisma.shortlistItem.deleteMany({
      where: { campaignId, creatorProfileId },
    });
  }
}
