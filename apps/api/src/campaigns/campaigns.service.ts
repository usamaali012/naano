import { Injectable, NotFoundException } from "@nestjs/common";
import type { Campaign } from "@prisma/client";
import type { CampaignSummary } from "@naano/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The campaign the marketplace ranks for and the shortlist is keyed to. The
   * most recent live campaign; if none are live, the most recent campaign of
   * any status; null only when the brand has no campaigns at all.
   */
  async getActive(): Promise<Campaign | null> {
    const live = await this.prisma.campaign.findFirst({
      where: { status: "LIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (live) return live;
    return this.prisma.campaign.findFirst({ orderBy: { createdAt: "desc" } });
  }

  async getActiveOrThrow(): Promise<Campaign> {
    const active = await this.getActive();
    if (!active) {
      throw new NotFoundException("No campaign exists yet");
    }
    return active;
  }

  /** Exists check used by the shortlist routes before touching child rows. */
  async assertExists(campaignId: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new NotFoundException(`No campaign "${campaignId}"`);
    }
    return campaign;
  }

  static toSummary(campaign: Campaign): CampaignSummary {
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      targetVertical: campaign.targetVertical,
    };
  }
}
