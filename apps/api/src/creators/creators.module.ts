import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CreatorsController } from "./creators.controller";
import { CreatorsService } from "./creators.service";

@Module({
  imports: [CampaignsModule],
  controllers: [CreatorsController],
  providers: [CreatorsService],
  exports: [CreatorsService],
})
export class CreatorsModule {}
