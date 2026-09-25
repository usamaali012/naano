import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import type { MarkPublishedBody } from "@naano/shared";

const ALLOWED_HOSTS = new Set(["linkedin.com", "www.linkedin.com", "x.com", "twitter.com"]);

@ValidatorConstraint({ name: "isPostUrl", async: false })
class IsPostUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname.toLowerCase());
  }

  defaultMessage(): string {
    return "postUrl must be an https link on linkedin.com, x.com or twitter.com";
  }
}

export class MarkPublishedDto implements MarkPublishedBody {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Validate(IsPostUrlConstraint)
  postUrl!: string;
}
