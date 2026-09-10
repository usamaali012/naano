import { Controller, Get, Param, Query } from "@nestjs/common";
import type {
  CreatorProfile,
  CreatorProfileDetail,
  Paginated,
} from "@naano/shared";
import { CreatorsService } from "./creators.service";
import { ListCreatorsDto } from "./dto/list-creators.dto";

@Controller("creators")
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get()
  list(@Query() query: ListCreatorsDto): Promise<Paginated<CreatorProfile>> {
    return this.creatorsService.list(query);
  }

  @Get(":id")
  detail(@Param("id") id: string): Promise<CreatorProfileDetail> {
    return this.creatorsService.detail(id);
  }
}
