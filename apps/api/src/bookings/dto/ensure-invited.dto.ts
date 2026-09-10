import { IsNotEmpty, IsString } from "class-validator";

export class EnsureInvitedDto {
  @IsString()
  @IsNotEmpty()
  creatorProfileId!: string;
}
