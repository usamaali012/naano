import { Injectable, NotFoundException } from "@nestjs/common";
import type { BookingStatus, Campaign, CampaignStatus } from "@prisma/client";
import type { CampaignOverview, CampaignSummary, Paginated } from "@naano/shared";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_PAGE_SIZE = 20;

/** LIVE first, then DRAFT, then COMPLETED — not the schema's declaration order. */
const STATUS_ORDER: Record<CampaignStatus, number> = {
  LIVE: 0,
  DRAFT: 1,
  COMPLETED: 2,
};

/** ACCEPTED through PAID, i.e. every non-INVITED, non-DECLINED status. */
const COMMITTED_STATUSES: readonly BookingStatus[] = [
  "ACCEPTED",
  "DRAFT_READY",
  "SCHEDULED",
  "LIVE",
  "PAID",
];

interface CampaignMoney {
  pendingCents: number;
  committedCents: number;
  paidCents: number;
  bookingsCount: number;
}

const ZERO_MONEY: CampaignMoney = {
  pendingCents: 0,
  committedCents: 0,
  paidCents: 0,
  bookingsCount: 0,
};

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The company row for a signed-in COMPANY user. */
  private async companyIdForUser(userId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { userId } });
    if (!company) {
      throw new NotFoundException("No company profile for this account");
    }
    return company.id;
  }

  /**
   * The campaign the marketplace ranks for and the shortlist is keyed to. The
   * most recent live campaign; if none are live, the most recent campaign of
   * any status; null only when the brand has no campaigns at all.
   */
  async getActive(): Promise<Campaign | null> {
    const live = await this.prisma.campaign.findFirst({
      where: { status: "LIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (live) return live;
    return this.prisma.campaign.findFirst({ orderBy: { createdAt: "desc" } });
  }

  async getActiveOrThrow(): Promise<Campaign> {
    const active = await this.getActive();
    if (!active) {
      throw new NotFoundException("No campaign exists yet");
    }
    return active;
  }

  /**
   * Same fallback as getActive() (most recent LIVE, else most recent of any
   * status) but scoped to one company. This is the campaign a booking is
   * created against — a brand must only ever book from its own campaign.
   */
  async getActiveForCompany(companyId: string): Promise<Campaign | null> {
    const live = await this.prisma.campaign.findFirst({
      where: { companyId, status: "LIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (live) return live;
    return this.prisma.campaign.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getActiveForCompanyOrThrow(companyId: string): Promise<Campaign> {
    const active = await this.getActiveForCompany(companyId);
    if (!active) {
      throw new NotFoundException("Your company has no campaign yet");
    }
    return active;
  }

  /** Exists check used by the shortlist routes before touching child rows. */
  async assertExists(campaignId: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new NotFoundException(`No campaign "${campaignId}"`);
    }
    return campaign;
  }

  /**
   * A campaign by id, scoped to one company. 404s (not 403 — same probing
   * concern as bookings' ownership checks) both when the id doesn't exist and
   * when it belongs to a different company, so a brand can't tell the two
   * cases apart.
   */
  async getOwnedByCompanyOrThrow(companyId: string, campaignId: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || campaign.companyId !== companyId) {
      throw new NotFoundException(`No campaign "${campaignId}"`);
    }
    return campaign;
  }

  /**
   * The signed-in company's own campaigns, paginated, LIVE first then DRAFT
   * then COMPLETED, newest first within each band. Money per campaign
   * (pending/committed/paid/bookingsCount) comes from one groupBy over
   * Booking for the page's campaign ids, not a query per campaign.
   */
  async list(userId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<CampaignOverview>> {
    const companyId = await this.companyIdForUser(userId);

    // Ordering mixes an enum priority with createdAt — not a single Prisma
    // orderBy — so fetch the (small, per-company) set and sort in memory,
    // the same pattern creators.service.ts uses for best_match.
    const all = await this.prisma.campaign.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    all.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

    const total = all.length;
    const start = (page - 1) * pageSize;
    const pageCampaigns = all.slice(start, start + pageSize);

    const moneyByCampaignId = await this.moneyForCampaigns(pageCampaigns.map((c) => c.id));

    const items = pageCampaigns.map((campaign) => ({
      ...CampaignsService.toSummary(campaign),
      budgetCents: campaign.budgetCents,
      ...(moneyByCampaignId.get(campaign.id) ?? ZERO_MONEY),
    }));

    return { items, total, page, pageSize };
  }

  /** One groupBy over Booking for every campaign id on the page, folded up per campaign. */
  private async moneyForCampaigns(campaignIds: string[]): Promise<Map<string, CampaignMoney>> {
    const result = new Map<string, CampaignMoney>();
    if (campaignIds.length === 0) return result;

    const grouped = await this.prisma.booking.groupBy({
      by: ["campaignId", "status"],
      where: { campaignId: { in: campaignIds } },
      _sum: { agreedPriceCents: true },
      _count: { _all: true },
    });

    for (const row of grouped) {
      const money = result.get(row.campaignId) ?? { ...ZERO_MONEY };
      const cents = row._sum.agreedPriceCents ?? 0;

      if (row.status === "INVITED") {
        money.pendingCents += cents;
      }
      if (COMMITTED_STATUSES.includes(row.status)) {
        money.committedCents += cents;
      }
      if (row.status === "PAID") {
        money.paidCents += cents;
      }
      if (row.status !== "DECLINED") {
        money.bookingsCount += row._count._all;
      }

      result.set(row.campaignId, money);
    }

    return result;
  }

  static toSummary(campaign: Campaign): CampaignSummary {
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      targetVertical: campaign.targetVertical,
    };
  }
}
