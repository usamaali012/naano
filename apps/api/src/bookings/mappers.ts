import type { Booking as PrismaBooking, Campaign, Company, CreatorProfile } from "@prisma/client";
import type { Booking, BookingReceived, BookingSent } from "@naano/shared";

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

/**
 * A Booking plus creator/campaign context, for the brand's Collaborations
 * table. `package` isn't a stored column — `agreedPriceCents` is set
 * server-side at creation to exactly the creator's own `postCostCents` or
 * `bundle5PriceCents` (see `BookingsService.create`) and never changes after,
 * so comparing against `bundle5PriceCents` recovers it exactly. `deliverable`
 * is free text the brand can edit after the fact, so it is never a source of
 * truth for which package was booked.
 */
export function toBookingSent(
  row: BookingRow & { campaign: Campaign; creatorProfile: CreatorProfile },
): BookingSent {
  return {
    ...toBooking(row),
    creatorDisplayName: row.creatorProfile.displayName,
    campaignName: row.campaign.name,
    package: row.agreedPriceCents === row.creatorProfile.bundle5PriceCents ? "bundle" : "single",
  };
}
