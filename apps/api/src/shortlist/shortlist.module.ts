import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { ShortlistController } from "./shortlist.controller";
import { ShortlistService } from "./shortlist.service";

@Module({
  imports: [CampaignsModule],
  controllers: [ShortlistController],
  providers: [ShortlistService],
})
export class ShortlistModule {}
