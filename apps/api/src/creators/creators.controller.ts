import { Controller, Get, Query } from "@nestjs/common";
import type { CreatorProfile, Paginated } from "@naano/shared";
import { CreatorsService } from "./creators.service";
import { ListCreatorsDto } from "./dto/list-creators.dto";

@Controller("creators")
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get()
  list(@Query() query: ListCreatorsDto): Promise<Paginated<CreatorProfile>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.creatorsService.list(page, pageSize);
  }
}
