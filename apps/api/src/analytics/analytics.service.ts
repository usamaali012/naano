import { Injectable, NotFoundException } from "@nestjs/common";
import type { AttributionResponse, AttributionRow } from "@naano/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The company row for a signed-in COMPANY user. Same pattern as BookingsService. */
  private async companyIdForUser(userId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { userId } });
    if (!company) {
      throw new NotFoundException("No company profile for this account");
    }
    return company.id;
  }

  /**
   * Clicks attributed per creator for the signed-in brand, across every
   * campaign. Only creators with at least one accepted (TrackedLink-bearing)
   * booking are included — invited/declined bookings already live in
   * Collaborations and have no link to click. Aggregated in memory: the
   * result set is bounded by how many distinct creators one brand has ever
   * accepted a booking with, the same small-catalogue justification the
   * creators list already uses.
   */
  async attribution(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<AttributionResponse> {
    const companyId = await this.companyIdForUser(userId);

    const accepted = await this.prisma.booking.findMany({
      where: { campaign: { companyId }, trackedLink: { isNot: null } },
      select: {
        creatorProfileId: true,
        creatorProfile: { select: { displayName: true } },
        trackedLink: { select: { id: true } },
      },
    });

    if (accepted.length === 0) {
      return { items: [], total: 0, page, pageSize, hasAnyClicks: false };
    }

    const trackedLinkIds = accepted.map((b) => b.trackedLink!.id);
    const linkToCreator = new Map(accepted.map((b) => [b.trackedLink!.id, b.creatorProfileId]));

    const [clicksByLink, latestByLink] = await Promise.all([
      this.prisma.clickEvent.groupBy({
        by: ["trackedLinkId"],
        where: { trackedLinkId: { in: trackedLinkIds } },
        _count: { _all: true },
      }),
      this.prisma.clickEvent.groupBy({
        by: ["trackedLinkId"],
        where: { trackedLinkId: { in: trackedLinkIds } },
        _max: { createdAt: true },
      }),
    ]);

    const clicksByCreator = new Map<string, number>();
    for (const row of clicksByLink) {
      const creatorId = linkToCreator.get(row.trackedLinkId);
      if (!creatorId) continue;
      clicksByCreator.set(creatorId, (clicksByCreator.get(creatorId) ?? 0) + row._count._all);
    }

    const lastClickByCreator = new Map<string, Date>();
    for (const row of latestByLink) {
      const creatorId = linkToCreator.get(row.trackedLinkId);
      if (!creatorId || !row._max.createdAt) continue;
      const current = lastClickByCreator.get(creatorId);
      if (!current || row._max.createdAt > current) {
        lastClickByCreator.set(creatorId, row._max.createdAt);
      }
    }

    const bookingsByCreator = new Map<string, { count: number; displayName: string }>();
    for (const b of accepted) {
      const existing = bookingsByCreator.get(b.creatorProfileId);
      if (existing) {
        existing.count += 1;
      } else {
        bookingsByCreator.set(b.creatorProfileId, {
          count: 1,
          displayName: b.creatorProfile.displayName,
        });
      }
    }

    const rows: AttributionRow[] = Array.from(bookingsByCreator.entries())
      .map(([creatorProfileId, { count, displayName }]) => ({
        creatorProfileId,
        creatorDisplayName: displayName,
        acceptedBookingsCount: count,
        totalClicks: clicksByCreator.get(creatorProfileId) ?? 0,
        lastClickAt: lastClickByCreator.get(creatorProfileId)?.toISOString() ?? null,
      }))
      .sort(
        (a, b) =>
          b.totalClicks - a.totalClicks ||
          a.creatorDisplayName.localeCompare(b.creatorDisplayName),
      );

    const hasAnyClicks = rows.some((r) => r.totalClicks > 0);
    const total = rows.length;
    const items = rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    return { items, total, page, pageSize, hasAnyClicks };
  }
}
