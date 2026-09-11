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
import type { Booking, BookingReceived, Paginated } from "@naano/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";
import { ListBookingsSentDto } from "./dto/list-bookings-sent.dto";

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
  ): Promise<Paginated<BookingReceived>> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.listReceived(sub, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get("sent")
  @Roles("COMPANY")
  listSent(
    @Req() req: Request,
    @Query() query: ListBookingsSentDto,
  ): Promise<Paginated<Booking>> {
    const { sub } = req.user as JwtPayload;
    return this.bookings.listSent(
      sub,
      query.page ?? 1,
      query.pageSize ?? 20,
      query.campaignId,
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
}
