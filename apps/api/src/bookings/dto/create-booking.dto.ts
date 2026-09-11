import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { BookingPackage } from "@naano/shared";

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  creatorProfileId!: string;

  @IsIn(["single", "bundle"])
  package!: BookingPackage;

  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  deliverable!: string;
}
