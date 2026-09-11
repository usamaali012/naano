import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthMe, DemoCreatorResponse, Role } from "@naano/shared";

// The demo brand EntryPage signs into for "Continue as a brand"
// (apps/web/src/routes/EntryPage.tsx, apps/api/prisma/seed.ts). demoCreatorEmail
// resolves "Continue as a creator" relative to this same account.
const DEMO_BRAND_EMAIL = "growth@ledgerly.example.com";

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

  /**
   * Demo affordance, public and unauthenticated: which creator account
   * EntryPage's "Continue as a creator" should sign into. Resolves to the
   * creator the demo brand (Ledgerly) most recently booked, so anyone who
   * books a creator as the brand and clicks through as a creator lands on
   * exactly that person with a fresh INVITED row — falls back to the first
   * creator the seed created when the demo brand has no bookings at all.
   * Returns nothing but a seeded account's email, so this is safe to leave
   * public and reachable in production, unlike the NonProductionGuard-gated
   * /dev/* routes.
   */
  async demoCreatorEmail(): Promise<DemoCreatorResponse> {
    const mostRecent = await this.prisma.booking.findFirst({
      where: { campaign: { company: { user: { email: DEMO_BRAND_EMAIL } } } },
      orderBy: { createdAt: "desc" },
      include: { creatorProfile: { include: { user: true } } },
    });
    if (mostRecent) {
      return { email: mostRecent.creatorProfile.user.email };
    }

    const fallback = await this.prisma.creatorProfile.findFirst({
      orderBy: { createdAt: "asc" },
      include: { user: true },
    });
    if (!fallback) {
      throw new NotFoundException("No creators seeded");
    }
    return { email: fallback.user.email };
  }
}
