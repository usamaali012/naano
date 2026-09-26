import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  Booking,
  BookingStatus,
  BrandCollaboration,
  CreatorCollaboration,
  CreatorEarnings,
  EarningsMonth,
  Paginated,
} from "@naano/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { generateTrackedLinkSlug } from "../tracking/slug";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { toBooking, toBrandCollaboration, toCreatorCollaboration } from "./mappers";
import { netCents } from "./money";
import { TRANSITIONS, wrongStateMessage, type BookingAction } from "./transitions";

/** ACCEPTED through LIVE: the creator has agreed but hasn't been paid yet. */
const IN_TRANSIT_STATUSES: readonly BookingStatus[] = [
  "ACCEPTED",
  "DRAFT_READY",
  "SCHEDULED",
  "LIVE",
];

const MONTHLY_WINDOW = 6;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Six months oldest first, including the current one, zero-filled up front. */
function emptyMonths(): EarningsMonth[] {
  const now = new Date();
  const months: EarningsMonth[] = [];
  for (let i = MONTHLY_WINDOW - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ month: monthKey(d), netCents: 0 });
  }
  return months;
}

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
   * Brand-only: create a Booking against the signed-in company's active
   * campaign, or a chosen one via `dto.campaignId` — 404 if it doesn't
   * belong to this company, 409 if it's COMPLETED. Omitted `campaignId`
   * keeps the original behaviour exactly: the active campaign, no COMPLETED
   * check (a brand's active campaign can itself be COMPLETED when they have
   * no LIVE/DRAFT campaign, and that was never blocked). The price is never
   * taken from the client — it is derived here from the creator's own
   * postCostCents / bundle5PriceCents, keyed on which package was selected,
   * so the amount can't be tampered with in transit. Going over budget is
   * never blocked here — that's the brand's call, not the API's.
   */
  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    const companyId = await this.companyIdForUser(userId);
    const campaign = dto.campaignId
      ? await this.campaigns.getOwnedByCompanyOrThrow(companyId, dto.campaignId)
      : await this.campaigns.getActiveForCompanyOrThrow(companyId);

    if (dto.campaignId && campaign.status === "COMPLETED") {
      throw new ConflictException(
        "This campaign is completed, so it can't take new bookings.",
      );
    }

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

  /**
   * Creator-only: bookings addressed to the signed-in creator's own profile,
   * as the Collaborations screen renders them — Next action and net earnings
   * derived per row, never stored.
   */
  async listReceived(
    userId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<Paginated<CreatorCollaboration>> {
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
          post: true,
        },
      }),
      this.prisma.booking.count({ where: { creatorProfileId } }),
    ]);

    return { items: rows.map(toCreatorCollaboration), total, page, pageSize };
  }

  /**
   * Creator-only, own profile only: the creator's money in one response.
   * PAID bookings drive totalEarnedCents/paidCollaborationsCount/averageCents
   * and the monthly chart; ACCEPTED..LIVE bookings drive inTransitCents. No
   * pagination — this is a summary, not a list.
   */
  async earnings(userId: string): Promise<CreatorEarnings> {
    const creatorProfileId = await this.creatorProfileIdForUser(userId);

    const [paidBookings, inTransitBookings] = await Promise.all([
      this.prisma.booking.findMany({
        where: { creatorProfileId, status: "PAID" },
        include: { payout: true },
      }),
      this.prisma.booking.findMany({
        where: { creatorProfileId, status: { in: [...IN_TRANSIT_STATUSES] } },
      }),
    ]);

    const totalEarnedCents = paidBookings.reduce(
      (sum, b) => sum + netCents(b.agreedPriceCents),
      0,
    );
    const paidCollaborationsCount = paidBookings.length;
    const averageCents =
      paidCollaborationsCount > 0
        ? Math.round(totalEarnedCents / paidCollaborationsCount)
        : 0;
    const inTransitCents = inTransitBookings.reduce(
      (sum, b) => sum + netCents(b.agreedPriceCents),
      0,
    );

    const monthly = emptyMonths();
    const byMonth = new Map(monthly.map((m) => [m.month, m]));
    for (const booking of paidBookings) {
      const paidAt = booking.payout?.paidAt ?? booking.createdAt;
      const bucket = byMonth.get(monthKey(paidAt));
      if (bucket) bucket.netCents += netCents(booking.agreedPriceCents);
    }

    return { totalEarnedCents, paidCollaborationsCount, averageCents, inTransitCents, monthly };
  }

  /**
   * Brand-only: every booking the signed-in company has made, optionally by
   * campaign and/or status. Backs the Collaborations table — rows carry the
   * brand's own next action plus the creator's draft/post, same as
   * `listReceived` does for the creator side.
   */
  async listSent(
    userId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    campaignId?: string,
    status?: BookingStatus,
  ): Promise<Paginated<BrandCollaboration>> {
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
          post: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items: rows.map(toBrandCollaboration), total, page, pageSize };
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

  /**
   * A booking owned by the signed-in creator, or 404 (never 403 — same
   * probing concern as `updateStatus`). Carries what every lifecycle write
   * on the creator side needs: current status (to check the transition) and
   * whether a Post already exists (to tell a first draft from a resubmit).
   */
  private async bookingOwnedByCreator(userId: string, bookingId: string) {
    const creatorProfileId = await this.creatorProfileIdForUser(userId);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { post: true },
    });
    if (!booking || booking.creatorProfileId !== creatorProfileId) {
      throw new NotFoundException(`No booking "${bookingId}"`);
    }
    return booking;
  }

  /** Same as `bookingOwnedByCreator`, for the brand side. */
  private async bookingOwnedByCompany(userId: string, bookingId: string) {
    const companyId = await this.companyIdForUser(userId);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { campaign: true, post: true },
    });
    if (!booking || booking.campaign.companyId !== companyId) {
      throw new NotFoundException(`No booking "${bookingId}"`);
    }
    return booking;
  }

  /** 409s with a readable sentence when the booking isn't in the state this action expects. */
  private assertTransition(action: BookingAction, status: BookingStatus): void {
    if (status !== TRANSITIONS[action].from) {
      throw new ConflictException(wrongStateMessage(action, status));
    }
  }

  private async creatorCollaborationById(bookingId: string): Promise<CreatorCollaboration> {
    const row = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        campaign: { include: { company: true } },
        trackedLink: TRACKED_LINK_SELECT,
        post: true,
      },
    });
    return toCreatorCollaboration(row);
  }

  private async brandCollaborationById(bookingId: string): Promise<BrandCollaboration> {
    const row = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        campaign: true,
        creatorProfile: true,
        trackedLink: TRACKED_LINK_SELECT,
        post: true,
      },
    });
    return toBrandCollaboration(row);
  }

  /**
   * Creator-only: submit (or resubmit, after a request-changes) the post
   * draft. `Post.content` is upserted — a resubmission overwrites whatever
   * was there, it doesn't version it.
   */
  async submitDraft(userId: string, bookingId: string, content: string): Promise<CreatorCollaboration> {
    const booking = await this.bookingOwnedByCreator(userId, bookingId);
    this.assertTransition("draft", booking.status);

    await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id: bookingId }, data: { status: TRANSITIONS.draft.to } }),
      this.prisma.post.upsert({
        where: { bookingId },
        create: { bookingId, content },
        update: { content },
      }),
    ]);

    return this.creatorCollaborationById(bookingId);
  }

  /**
   * Creator-only: publish the approved draft. Sets the post live — the
   * client-supplied URL has already been validated (https, linkedin.com/
   * x.com/twitter.com only) by `MarkPublishedDto` before this runs.
   */
  async publish(userId: string, bookingId: string, postUrl: string): Promise<CreatorCollaboration> {
    const booking = await this.bookingOwnedByCreator(userId, bookingId);
    this.assertTransition("publish", booking.status);

    await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id: bookingId }, data: { status: TRANSITIONS.publish.to } }),
      this.prisma.post.update({
        where: { bookingId },
        data: { linkedinUrl: postUrl, publishedAt: new Date() },
      }),
    ]);

    return this.creatorCollaborationById(bookingId);
  }

  /** Brand-only: approve the creator's draft. */
  async approve(userId: string, bookingId: string): Promise<BrandCollaboration> {
    const booking = await this.bookingOwnedByCompany(userId, bookingId);
    this.assertTransition("approve", booking.status);

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: TRANSITIONS.approve.to },
    });
    return this.brandCollaborationById(bookingId);
  }

  /** Brand-only: send the draft back to the creator for changes. */
  async requestChanges(userId: string, bookingId: string): Promise<BrandCollaboration> {
    const booking = await this.bookingOwnedByCompany(userId, bookingId);
    this.assertTransition("requestChanges", booking.status);

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: TRANSITIONS.requestChanges.to },
    });
    return this.brandCollaborationById(bookingId);
  }

  /**
   * Brand-only: record that the creator has been paid. Payout matches how
   * the seed writes it — `amountCents` is the full `agreedPriceCents`, not
   * the creator's net; the commission is applied at render time only (see
   * `money.ts`), never stored.
   */
  async markPaid(userId: string, bookingId: string): Promise<BrandCollaboration> {
    const booking = await this.bookingOwnedByCompany(userId, bookingId);
    this.assertTransition("markPaid", booking.status);

    await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id: bookingId }, data: { status: TRANSITIONS.markPaid.to } }),
      this.prisma.payout.upsert({
        where: { bookingId },
        create: { bookingId, amountCents: booking.agreedPriceCents, status: "PAID", paidAt: new Date() },
        update: { amountCents: booking.agreedPriceCents, status: "PAID", paidAt: new Date() },
      }),
    ]);

    return this.brandCollaborationById(bookingId);
  }
}
