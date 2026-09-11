import { IsIn, IsOptional, IsString } from "class-validator";
import type { BookingStatus } from "@naano/shared";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

const STATUSES: readonly BookingStatus[] = [
  "INVITED",
  "ACCEPTED",
  "DECLINED",
  "DRAFT_READY",
  "SCHEDULED",
  "LIVE",
  "PAID",
];

export class ListBookingsSentDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: BookingStatus;
}
