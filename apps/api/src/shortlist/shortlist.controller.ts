import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import type { MarketplaceCreator, Paginated } from "@naano/shared";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { ShortlistService } from "./shortlist.service";
import { AddToShortlistDto } from "./dto/add-to-shortlist.dto";

// Campaign-scoped shortlist. The marketplace Shortlist tab and the campaign
// Shortlist tab both read GET here for the campaign in context.
@Controller("campaigns/:campaignId/shortlist")
export class ShortlistController {
  constructor(private readonly shortlist: ShortlistService) {}

  @Get()
  list(
    @Param("campaignId") campaignId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<MarketplaceCreator>> {
    return this.shortlist.list(campaignId, query.page ?? 1, query.pageSize ?? 20);
  }

  @Post()
  @HttpCode(201)
  add(
    @Param("campaignId") campaignId: string,
    @Body() body: AddToShortlistDto,
  ): Promise<MarketplaceCreator> {
    return this.shortlist.add(campaignId, body.creatorProfileId);
  }

  @Delete(":creatorProfileId")
  @HttpCode(204)
  remove(
    @Param("campaignId") campaignId: string,
    @Param("creatorProfileId") creatorProfileId: string,
  ): Promise<void> {
    return this.shortlist.remove(campaignId, creatorProfileId);
  }
}
