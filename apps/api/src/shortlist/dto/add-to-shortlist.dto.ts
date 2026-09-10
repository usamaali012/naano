import { IsNotEmpty, IsString } from "class-validator";

export class AddToShortlistDto {
  @IsString()
  @IsNotEmpty()
  creatorProfileId!: string;
}
