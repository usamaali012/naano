import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { Paginated } from "@naano/shared";
import { NonProductionGuard } from "../common/non-production.guard";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { TrackingService, type TrackedLinkView } from "./tracking.service";

/**
 * Dev-only. Unavailable when NODE_ENV === "production" (the guard 404s).
 * Exists so the tracked-link happy path is inspectable without the database.
 */
@Controller("dev/tracked-links")
@UseGuards(NonProductionGuard)
export class DevTrackedLinksController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get()
  list(@Query() query: PaginationQueryDto): Promise<Paginated<TrackedLinkView>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.trackingService.listTrackedLinks(page, pageSize);
  }
}
