import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type {
  CreatorProfileDetail,
  MarketplaceCreator,
  Paginated,
} from "@naano/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";
import { CreatorsService } from "./creators.service";
import { ListCreatorsDto } from "./dto/list-creators.dto";
import { UpdateMyCardDto } from "./dto/update-my-card.dto";

@Controller("creators")
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get()
  list(@Query() query: ListCreatorsDto): Promise<Paginated<MarketplaceCreator>> {
    return this.creatorsService.list(query);
  }

  // Declared before ":id" so "me" is never swallowed by the param route.
  @Patch("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CREATOR")
  updateMyCard(
    @Req() req: Request,
    @Body() dto: UpdateMyCardDto,
  ): Promise<CreatorProfileDetail> {
    const { sub } = req.user as JwtPayload;
    return this.creatorsService.updateMyCard(sub, dto);
  }

  @Get(":id")
  detail(@Param("id") id: string): Promise<CreatorProfileDetail> {
    return this.creatorsService.detail(id);
  }
}
