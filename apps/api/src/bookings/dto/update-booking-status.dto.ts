import { IsIn } from "class-validator";
import type { UpdateBookingStatusBody } from "@naano/shared";

export class UpdateBookingStatusDto implements UpdateBookingStatusBody {
  @IsIn(["ACCEPTED", "DECLINED"])
  status!: UpdateBookingStatusBody["status"];
}
