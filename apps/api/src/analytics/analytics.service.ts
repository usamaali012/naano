import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AttributionResponse,
  AttributionRow,
  BookingStatus,
  ClicksDay,
  ResultsOverview,
  StatusCount,
} from "@naano/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/** Every BookingStatus, in the order A7's Results overview shows them. */
const STATUS_ORDER: readonly BookingStatus[] = [
  "INVITED",
  "ACCEPTED",
  "DRAFT_READY",
  "SCHEDULED",
  "LIVE",
  "PAID",
  "DECLINED",
];

/** ACCEPTED through PAID: everything except INVITED and DECLINED. */
const COMMITTED_STATUSES: ReadonlySet<BookingStatus> = new Set([
  "ACCEPTED",
  "DRAFT_READY",
  "SCHEDULED",
  "LIVE",
  "PAID",
]);

const CLICKS_WINDOW_DAYS = 30;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** UTC midnight, `daysAgo` days before today (0 = today). */
function utcDayStart(daysAgo: number): Date {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  today.setUTCDate(today.getUTCDate() - daysAgo);
  return today;
}

/** Last 30 days including today, UTC, zero-filled, oldest first. */
function emptyClicksDays(): ClicksDay[] {
  const days: ClicksDay[] = [];
  for (let i = CLICKS_WINDOW_DAYS - 1; i >= 0; i--) {
    days.push({ date: dayKey(utcDayStart(i)), clicks: 0 });
  }
  return days;
}

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

  /**
   * Real aggregates for the Results dashboard, scoped to the signed-in
   * company's own campaigns. One pass over the company's bookings (bounded
   * by how many bookings one brand has ever made, same small-catalogue
   * justification `attribution` above already uses) drives
   * `bookingsByStatus`/`paidCents`/`committedCents` and collects the
   * `TrackedLink` ids that feed the two click aggregates.
   */
  async overview(userId: string): Promise<ResultsOverview> {
    const companyId = await this.companyIdForUser(userId);

    const bookings = await this.prisma.booking.findMany({
      where: { campaign: { companyId } },
      select: {
        status: true,
        agreedPriceCents: true,
        trackedLink: { select: { id: true } },
      },
    });

    const countByStatus = new Map<BookingStatus, number>();
    let paidCents = 0;
    let committedCents = 0;
    const trackedLinkIds: string[] = [];
    for (const b of bookings) {
      countByStatus.set(b.status, (countByStatus.get(b.status) ?? 0) + 1);
      if (b.status === "PAID") paidCents += b.agreedPriceCents;
      if (COMMITTED_STATUSES.has(b.status)) committedCents += b.agreedPriceCents;
      if (b.trackedLink) trackedLinkIds.push(b.trackedLink.id);
    }
    const bookingsByStatus: StatusCount[] = STATUS_ORDER.map((status) => ({
      status,
      count: countByStatus.get(status) ?? 0,
    }));

    const clicksByDay = emptyClicksDays();
    const rangeStart = utcDayStart(CLICKS_WINDOW_DAYS - 1);

    const [totalClicksAllTime, dailyRows] = await Promise.all([
      trackedLinkIds.length > 0
        ? this.prisma.clickEvent.count({ where: { trackedLinkId: { in: trackedLinkIds } } })
        : Promise.resolve(0),
      trackedLinkIds.length > 0
        ? this.prisma.$queryRaw<{ day: Date; count: number }[]>(
            Prisma.sql`
              SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
              FROM "ClickEvent"
              WHERE "trackedLinkId" IN (${Prisma.join(trackedLinkIds)})
                AND "createdAt" >= ${rangeStart}
              GROUP BY day
            `,
          )
        : Promise.resolve([]),
    ]);

    const byDay = new Map(clicksByDay.map((d) => [d.date, d]));
    for (const row of dailyRows) {
      const bucket = byDay.get(dayKey(row.day));
      if (bucket) bucket.clicks = row.count;
    }
    const totalClicks30d = clicksByDay.reduce((sum, d) => sum + d.clicks, 0);

    return {
      clicksByDay,
      totalClicks30d,
      totalClicksAllTime,
      bookingsByStatus,
      paidCents,
      committedCents,
    };
  }
}
