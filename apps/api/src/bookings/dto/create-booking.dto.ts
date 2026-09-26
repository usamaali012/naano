import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
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

  /**
   * Must belong to the signed-in company (404 otherwise); a COMPLETED
   * campaign is 409. Omitted means the active campaign, exactly as before.
   */
  @IsOptional()
  @IsString()
  campaignId?: string;
}
