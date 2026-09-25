import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import type { UpdateMyCardBody } from "@naano/shared";

// Keep in sync with UpdateMyCardBody's doc comment in packages/shared/src/api.ts.
const MIN_PRICE_CENTS = 5_000;
const MAX_PRICE_CENTS = 2_250_000;

// Body of PATCH /creators/me. Every field optional here; the service enforces
// "at least one field" and the bundle5PriceCents-vs-postCostCents cross-check,
// neither of which a per-field decorator can express.
export class UpdateMyCardDto implements UpdateMyCardBody {
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(1, 160)
  headline?: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_PRICE_CENTS)
  @Max(MAX_PRICE_CENTS)
  postCostCents?: number;

  @IsOptional()
  @IsInt()
  @Min(MIN_PRICE_CENTS)
  @Max(MAX_PRICE_CENTS)
  bundle5PriceCents?: number;
}
