import { createHash } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Paginated } from "@naano/shared";
import { PrismaService } from "../prisma/prisma.service";

interface RecordClickParams {
  slug: string;
  referrer: string | undefined;
  userAgent: string | undefined;
  ip: string;
}

export interface TrackedLinkView {
  id: string;
  slug: string;
  destinationUrl: string;
  campaign: { id: string; name: string };
  creator: { id: string; displayName: string };
}

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async recordClickAndGetDestination(params: RecordClickParams): Promise<string> {
    const trackedLink = await this.prisma.trackedLink.findUnique({
      where: { slug: params.slug },
    });

    if (!trackedLink) {
      throw new NotFoundException(`No tracked link for slug "${params.slug}"`);
    }

    await this.prisma.clickEvent.create({
      data: {
        trackedLinkId: trackedLink.id,
        referrer: params.referrer ?? null,
        userAgent: params.userAgent ?? null,
        ipHash: this.hashIp(params.ip),
      },
    });

    return trackedLink.destinationUrl;
  }

  /**
   * Dev-only. Lists tracked links with the campaign and creator they belong to
   * so the `GET /r/:slug` happy path can be exercised without opening the DB.
   */
  async listTrackedLinks(
    page: number,
    pageSize: number,
  ): Promise<Paginated<TrackedLinkView>> {
    const [rows, total] = await Promise.all([
      this.prisma.trackedLink.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          booking: {
            include: {
              campaign: { select: { id: true, name: true } },
              creatorProfile: { select: { id: true, displayName: true } },
            },
          },
        },
      }),
      this.prisma.trackedLink.count(),
    ]);

    const items: TrackedLinkView[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      destinationUrl: row.destinationUrl,
      campaign: {
        id: row.booking.campaign.id,
        name: row.booking.campaign.name,
      },
      creator: {
        id: row.booking.creatorProfile.id,
        displayName: row.booking.creatorProfile.displayName,
      },
    }));

    return { items, total, page, pageSize };
  }

  private hashIp(ip: string): string {
    const salt = process.env.IP_HASH_SALT ?? "dev-salt-change-me";
    return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
  }
}
