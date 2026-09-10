import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthMe, Role } from "@naano/shared";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    });

    return { accessToken };
  }

  /** The signed-in user, plus which side of the marketplace they belong to. */
  async me(userId: string): Promise<AuthMe> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true, creatorProfile: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      companyId: user.company?.id ?? null,
      creatorProfileId: user.creatorProfile?.id ?? null,
      displayName:
        user.company?.name ?? user.creatorProfile?.displayName ?? null,
    };
  }
}
