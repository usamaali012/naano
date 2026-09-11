import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListBookingsSentDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  campaignId?: string;
}
