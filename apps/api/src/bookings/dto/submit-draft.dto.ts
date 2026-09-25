import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { SubmitDraftBody } from "@naano/shared";

export class SubmitDraftDto implements SubmitDraftBody {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  content!: string;
}
