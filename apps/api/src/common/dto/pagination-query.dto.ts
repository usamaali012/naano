import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * Shared query shape for every list endpoint. With the global ValidationPipe
 * running `whitelist` + `forbidNonWhitelisted`, any param not declared on a
 * DTO that extends this (e.g. `limit`, `vertical`) 400s naming the field.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
