import { Module } from "@nestjs/common";
import { TrackingController } from "./tracking.controller";
import { DevTrackedLinksController } from "./dev-tracked-links.controller";
import { TrackingService } from "./tracking.service";

@Module({
  controllers: [TrackingController, DevTrackedLinksController],
  providers: [TrackingService],
})
export class TrackingModule {}
