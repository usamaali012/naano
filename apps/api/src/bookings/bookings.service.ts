import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Booking, BookingReceived, BookingSent, BookingStatus, Paginated } from "@naano/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { generateTrackedLinkSlug } from "../tracking/slug";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { toBooking, toBookingReceived, toBookingSent } from "./mappers";

const DEFAULT_PAGE_SIZE = 20;

/** Every booking read that surfaces trackedLinkSlug/clickCount needs this. */
const TRACKED_LINK_SELECT = {
  select: { slug: true, _count: { select: { clickEvents: true } } },
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaigns: CampaignsService,
  ) {}

  /** The company row for a signed-in COMPANY user. Every brand route needs it. */
  private async companyIdForUser(userId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { userId } });
    if (!company) {
      throw new NotFoundException("No company profile for this account");
    }
    return company.id;
  }

  /** The creator profile row for a signed-in CREATOR user. */
  private async creatorProfileIdForUser(userId: string): Promise<string> {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) {
      throw new NotFoundException("No creator profile for this account");
    }
    return creator.id;
  }

  /**
   * Brand-only: create a Booking from the signed-in company's active campaign.
   * The price is never taken from the client — it is derived here from the
   * creator's own postCostCents / bundle5PriceCents, keyed on which package
   * was selected, so the amount can't be tampered with in transit.
   */
  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    const companyId = await this.companyIdForUser(userId);
    const campaign = await this.campaigns.getActiveForCompanyOrThrow(companyId);

    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: dto.creatorProfileId },
    });
    if (!creator) {
      throw new NotFoundException(`No creator profile "${dto.creatorProfileId}"`);
    }

    const existing = await this.prisma.booking.findFirst({
      where: {
        campaignId: campaign.id,
        creatorProfileId: creator.id,
        status: { not: "DECLINED" },
      },
    });
    if (existing) {
      throw new ConflictException(
        `${creator.displayName} is already booked for this campaign`,
      );
    }

    const agreedPriceCents =
      dto.package === "bundle" ? creator.bundle5PriceCents : creator.postCostCents;

    const booking = await this.prisma.booking.create({
      data: {
        campaignId: campaign.id,
        creatorProfileId: creator.id,
        agreedPriceCents,
        deliverable: dto.deliverable,
        status: "INVITED",
        initiatedBy: "BRAND",
      },
    });

    return toBooking(booking);
  }

  /**
   * Dev-only. Guarantees the given creator has at least one INVITED booking,
   * so the demo/screenshot flow can show Accept/Decline without depending on
   * which status seed's random assignment happened to give them. A no-op if
   * one already exists. Otherwise picks a campaign the creator has no
   * non-declined booking against yet (never reusing one, unlike `create()`'s
   * real flow, this doesn't take a campaign from the client) so it never
   * produces a second booking in the same campaign.
   */
  async ensureInvitedForDev(creatorProfileId: string): Promise<Booking> {
    const existing = await this.prisma.booking.findFirst({
      where: { creatorProfileId, status: "INVITED" },
    });
    if (existing) return toBooking(existing);

    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
    });
    if (!creator) {
      throw new NotFoundException(`No creator profile "${creatorProfileId}"`);
    }

    const bookedCampaignIds = (
      await this.prisma.booking.findMany({
        where: { creatorProfileId, status: { not: "DECLINED" } },
        select: { campaignId: true },
      })
    ).map((b) => b.campaignId);

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: { notIn: bookedCampaignIds } },
    });
    if (!campaign) {
      throw new ConflictException(
        `${creator.displayName} already has a booking against every campaign`,
      );
    }

    const booking = await this.prisma.booking.create({
      data: {
        campaignId: campaign.id,
        creatorProfileId,
        agreedPriceCents: creator.postCostCents,
        deliverable: "1 sponsored LinkedIn post with tracked CTA link",
        status: "INVITED",
        initiatedBy: "BRAND",
      },
    });
    return toBooking(booking);
  }

  /** Creator-only: bookings addressed to the signed-in creator's own profile. */
  async listReceived(
    userId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<Paginated<BookingReceived>> {
    const creatorProfileId = await this.creatorProfileIdForUser(userId);

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { creatorProfileId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          campaign: { include: { company: true } },
          trackedLink: TRACKED_LINK_SELECT,
        },
      }),
      this.prisma.booking.count({ where: { creatorProfileId } }),
    ]);

    return { items: rows.map(toBookingReceived), total, page, pageSize };
  }

  /**
   * Brand-only: every booking the signed-in company has made, optionally by
   * campaign and/or status. Backs the Collaborations table.
   */
  async listSent(
    userId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    campaignId?: string,
    status?: BookingStatus,
  ): Promise<Paginated<BookingSent>> {
    const companyId = await this.companyIdForUser(userId);
    if (campaignId) {
      await this.campaigns.assertExists(campaignId);
    }

    const where = {
      campaign: { companyId },
      ...(campaignId ? { campaignId } : {}),
      ...(status ? { status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          trackedLink: TRACKED_LINK_SELECT,
          campaign: true,
          creatorProfile: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items: rows.map(toBookingSent), total, page, pageSize };
  }

  /**
   * Creator-only: accept or decline a booking addressed to them. 404s (not
   * 403) when the booking belongs to someone else, so a creator can't probe
   * for the existence of another creator's bookings. Accepting issues the
   * booking's TrackedLink in the same transaction — a booking is never left
   * accepted without a link, or vice versa. destinationUrl comes from the
   * campaign, never from client input.
   */
  async updateStatus(
    userId: string,
    bookingId: string,
    status: "ACCEPTED" | "DECLINED",
  ): Promise<Booking> {
    const creatorProfileId = await this.creatorProfileIdForUser(userId);

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { campaign: true },
    });
    if (!booking || booking.creatorProfileId !== creatorProfileId) {
      throw new NotFoundException(`No booking "${bookingId}"`);
    }
    if (booking.status !== "INVITED") {
      throw new ConflictException(
        `This booking is already ${booking.status.toLowerCase()}`,
      );
    }

    if (status === "DECLINED") {
      const updated = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status },
      });
      return toBooking(updated);
    }

    const slug = generateTrackedLinkSlug();
    const [updated] = await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id: bookingId }, data: { status } }),
      this.prisma.trackedLink.create({
        data: { bookingId, slug, destinationUrl: booking.campaign.destinationUrl },
      }),
    ]);

    return toBooking({ ...updated, trackedLink: { slug, _count: { clickEvents: 0 } } });
  }
}
