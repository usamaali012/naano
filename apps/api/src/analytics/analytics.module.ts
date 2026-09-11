import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

// GET /analytics/attribution (5.4) — clicks per creator for the signed-in
// brand. PrismaService is global (PrismaModule), no explicit import needed.
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
