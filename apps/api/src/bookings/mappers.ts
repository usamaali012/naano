import type { Booking as PrismaBooking, Campaign, Company } from "@prisma/client";
import type { Booking, BookingReceived } from "@naano/shared";

/** Prisma row -> wire-safe Booking (dates as ISO strings). */
export function toBooking(row: PrismaBooking): Booking {
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
  };
}

/** A Booking plus who it is from, for the creator's incoming-requests list. */
export function toBookingReceived(
  row: PrismaBooking & { campaign: Campaign & { company: Company } },
): BookingReceived {
  return {
    ...toBooking(row),
    campaignName: row.campaign.name,
    companyName: row.campaign.company.name,
  };
}
