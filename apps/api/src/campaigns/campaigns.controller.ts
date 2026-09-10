import { Controller, Get } from "@nestjs/common";
import type { CampaignSummary } from "@naano/shared";
import { CampaignsService } from "./campaigns.service";

@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  // The campaign the marketplace is ranked for and the shortlist is keyed to.
  // 404s only when the brand has no campaigns at all.
  @Get("active")
  async active(): Promise<CampaignSummary> {
    const campaign = await this.campaigns.getActiveOrThrow();
    return CampaignsService.toSummary(campaign);
  }
}
