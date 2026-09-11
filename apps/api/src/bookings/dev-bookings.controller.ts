import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import type { Booking } from "@naano/shared";
import { NonProductionGuard } from "../common/non-production.guard";
import { BookingsService } from "./bookings.service";
import { EnsureInvitedDto } from "./dto/ensure-invited.dto";

/**
 * Dev-only. Unavailable when NODE_ENV === "production" (404s). Exists so the
 * screenshot suite can guarantee the demo creator has a pending invite to
 * capture, independent of which BookingStatus seed's random assignment gave
 * them for a given reseed.
 */
@Controller("dev/bookings")
@UseGuards(NonProductionGuard)
export class DevBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post("ensure-invited")
  ensureInvited(@Body() dto: EnsureInvitedDto): Promise<Booking> {
    return this.bookings.ensureInvitedForDev(dto.creatorProfileId);
  }
}
