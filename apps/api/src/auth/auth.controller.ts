import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { AuthMe, DemoCreatorResponse } from "@naano/shared";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { JwtPayload } from "./jwt.strategy";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(dto.email, dto.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request): Promise<AuthMe> {
    const { sub } = req.user as JwtPayload;
    return this.authService.me(sub);
  }

  // Public: see AuthService.demoCreatorEmail for why this is safe unauthenticated.
  @Get("demo-creator")
  demoCreator(): Promise<DemoCreatorResponse> {
    return this.authService.demoCreatorEmail();
  }
}
