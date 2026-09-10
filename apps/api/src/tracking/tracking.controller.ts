import { Controller, Get, Headers, Param, Redirect, Req } from "@nestjs/common";
import type { Request } from "express";
import { TrackingService } from "./tracking.service";

@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get("r/:slug")
  @Redirect()
  async trackAndRedirect(
    @Param("slug") slug: string,
    @Req() req: Request,
    @Headers("referer") referrer: string | undefined,
    @Headers("user-agent") userAgent: string | undefined,
  ): Promise<{ url: string; statusCode: number }> {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const destinationUrl = await this.trackingService.recordClickAndGetDestination({
      slug,
      referrer,
      userAgent,
      ip,
    });

    return { url: destinationUrl, statusCode: 302 };
  }
}
