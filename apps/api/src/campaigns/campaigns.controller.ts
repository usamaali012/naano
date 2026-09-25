import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { CampaignOverview, CampaignSummary, Paginated } from "@naano/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { CampaignsService } from "./campaigns.service";

@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  // The signed-in company's own campaigns, with money against budget.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("COMPANY")
  list(
    @Req() req: Request,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<CampaignOverview>> {
    const { sub } = req.user as JwtPayload;
    return this.campaigns.list(sub, query.page ?? 1, query.pageSize ?? 20);
  }

  // The campaign the marketplace is ranked for and the shortlist is keyed to.
  // 404s only when the brand has no campaigns at all.
  @Get("active")
  async active(): Promise<CampaignSummary> {
    const campaign = await this.campaigns.getActiveOrThrow();
    return CampaignsService.toSummary(campaign);
  }
}
