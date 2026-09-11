import type { Booking as PrismaBooking, Campaign, Company } from "@prisma/client";
import type { Booking, BookingReceived } from "@naano/shared";

type BookingTrackedLink = { slug: string; _count: { clickEvents: number } } | null;

type BookingRow = PrismaBooking & { trackedLink?: BookingTrackedLink };

/** Prisma row -> wire-safe Booking (dates as ISO strings). */
export function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    campaignId: row.campaignId,
    creatorProfileId: row.creatorProfileId,
    agreedPriceCents: row.agreedPriceCents,
    status: row.status,
    initiatedBy: row.initiatedBy,
    deliverable: row.deliverable,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    trackedLinkSlug: row.trackedLink?.slug ?? null,
    clickCount: row.trackedLink ? row.trackedLink._count.clickEvents : null,
  };
}

/** A Booking plus who it is from, for the creator's incoming-requests list. */
export function toBookingReceived(
  row: BookingRow & { campaign: Campaign & { company: Company } },
): BookingReceived {
  return {
    ...toBooking(row),
    campaignName: row.campaign.name,
    companyName: row.campaign.company.name,
  };
}
