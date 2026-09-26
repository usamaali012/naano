import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import type {
  ActionCount,
  Booking,
  BrandCollaboration,
  CreatorCollaboration,
  CreatorEarnings,
  Paginated,
} from "@naano/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";
import { ListBookingsSentDto } from "./dto/list-bookings-sent.dto";
import { SubmitDraftDto } from "./dto/submit-draft.dto";
import { MarkPublishedDto } from "./dto/mark-published.dto";

@Controller("bookings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @Roles("COMPANY")
  create(@Req() req: Request, @Body() dto: CreateBookingDto): Promise<Booking> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.create(sub, dto);
  }

  @Get("received")
  @Roles("CREATOR")
  listReceived(
    @Req() req: Request,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<CreatorCollaboration>> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.listReceived(sub, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get("earnings")
  @Roles("CREATOR")
  earnings(@Req() req: Request): Promise<CreatorEarnings> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.earnings(sub);
  }

  @Get("action-count")
  @Roles("CREATOR", "COMPANY")
  actionCount(@Req() req: Request): Promise<ActionCount> {
    const { sub, role } = req.user as JwtPayload;
    return this.bookings.actionCount(sub, role);
  }

  @Get("sent")
  @Roles("COMPANY")
  listSent(
    @Req() req: Request,
    @Query() query: ListBookingsSentDto,
  ): Promise<Paginated<BrandCollaboration>> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.listSent(
      sub,
      query.page ?? 1,
      query.pageSize ?? 20,
      query.campaignId,
      query.status,
    );
  }

  @Patch(":id/status")
  @Roles("CREATOR")
  updateStatus(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.updateStatus(sub, id, dto.status);
  }

  @Post(":id/draft")
  @Roles("CREATOR")
  submitDraft(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: SubmitDraftDto,
  ): Promise<CreatorCollaboration> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.submitDraft(sub, id, dto.content);
  }

  @Post(":id/publish")
  @Roles("CREATOR")
  publish(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: MarkPublishedDto,
  ): Promise<CreatorCollaboration> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.publish(sub, id, dto.postUrl);
  }

  @Post(":id/approve")
  @Roles("COMPANY")
  approve(@Req() req: Request, @Param("id") id: string): Promise<BrandCollaboration> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.approve(sub, id);
  }

  @Post(":id/request-changes")
  @Roles("COMPANY")
  requestChanges(@Req() req: Request, @Param("id") id: string): Promise<BrandCollaboration> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.requestChanges(sub, id);
  }

  @Post(":id/mark-paid")
  @Roles("COMPANY")
  markPaid(@Req() req: Request, @Param("id") id: string): Promise<BrandCollaboration> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.markPaid(sub, id);
  }
}
