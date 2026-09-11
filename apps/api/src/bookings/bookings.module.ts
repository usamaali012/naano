import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { BookingsController } from "./bookings.controller";
import { DevBookingsController } from "./dev-bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({
  imports: [CampaignsModule],
  controllers: [BookingsController, DevBookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
