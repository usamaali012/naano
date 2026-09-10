import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CreatorsModule } from "./creators/creators.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { ShortlistModule } from "./shortlist/shortlist.module";
import { BookingsModule } from "./bookings/bookings.module";
import { TrackingModule } from "./tracking/tracking.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CreatorsModule,
    CampaignsModule,
    ShortlistModule,
    BookingsModule,
    TrackingModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
