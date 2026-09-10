import { Module } from "@nestjs/common";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";

// Only the "active campaign" lookup for now — the marketplace and the shortlist
// both need it. Full CRUD, brief, and status transitions land with slice 3.1.
@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
