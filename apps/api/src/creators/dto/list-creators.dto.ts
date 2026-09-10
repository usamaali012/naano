import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";
import type { CreatorSort, Vertical } from "@naano/shared";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

const VERTICALS: readonly Vertical[] = [
  "SALES",
  "REVOPS",
  "DEVTOOLS",
  "HR_TECH",
  "PRODUCT",
  "MARKETING_OPS",
  "FINTECH",
  "VERTICAL_SAAS",
];

const SORTS: readonly CreatorSort[] = [
  "best_match",
  "price_asc",
  "followers_desc",
  "engagement_desc",
];

/** One value or a repeated param normalised to an array, undefined left alone. */
function toArray(value: unknown): unknown {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

// Filters for GET /creators. Anything not declared here 400s (global
// forbidNonWhitelisted). Industry is the `vertical` enum; price is integer
// cents; `maxCpmEur` / `minEngagementPct` are the human units the UI shows.
export class ListCreatorsDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsIn(VERTICALS, { each: true })
  vertical?: Vertical[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value))
  @IsString()
  @Length(2, 2)
  country?: string;

  // Free-text match over display name and headline.
  @IsOptional()
  @IsString()
  @Length(1, 100)
  q?: string;

  // Campaign the list is ranked for. Fills icpFitPct and feeds best_match;
  // omitted, the API ranks against the most recent live campaign.
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMinCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMaxCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCpmEur?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minMedianViews?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minFollowers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxFollowers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minEngagementPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  postedWithinDays?: number;

  @IsOptional()
  @IsIn(SORTS)
  sort?: CreatorSort;
}
