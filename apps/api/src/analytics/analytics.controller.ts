import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { AttributionResponse } from "@naano/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";
import { AnalyticsService } from "./analytics.service";
import { ListAttributionDto } from "./dto/list-attribution.dto";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("attribution")
  @Roles("COMPANY")
  attribution(
    @Req() req: Request,
    @Query() query: ListAttributionDto,
  ): Promise<AttributionResponse> {
    const { sub } = req.user as JwtPayload;
    return this.analytics.attribution(sub, query.page ?? 1, query.pageSize ?? 20);
  }
}
