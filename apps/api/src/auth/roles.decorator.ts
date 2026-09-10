import { SetMetadata } from "@nestjs/common";
import type { Role } from "@naano/shared";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]): ReturnType<typeof SetMetadata> => SetMetadata(ROLES_KEY, roles);
