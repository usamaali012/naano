// Wire-shape types, derived from prisma/schema.prisma. Dates are ISO strings
// (JSON has no Date type); money is always integer cents.

import type {
  BookingStatus,
  CampaignStatus,
  PayoutStatus,
  Role,
  Vertical,
} from "./enums";

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  createdAt: string;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  headline: string;
  avatarUrl: string | null;
  vertical: Vertical;
  followerCount: number;
  country: string;
  language: string;
  pricePerPostCents: number;
  avgImpressions: number;
  engagementRate: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  companyId: string;
  name: string;
  objective: string;
  brief: string;
  keyMessages: string;
  guidelines: string;
  destinationUrl: string;
  budgetCents: number;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  campaignId: string;
  creatorProfileId: string;
  agreedPriceCents: number;
  status: BookingStatus;
  deliverable: string;
  deadline: string | null;
  createdAt: string;
}

export interface Post {
  id: string;
  bookingId: string;
  linkedinUrl: string | null;
  content: string;
  publishedAt: string | null;
  impressions: number;
}

export interface TrackedLink {
  id: string;
  bookingId: string;
  slug: string;
  destinationUrl: string;
  createdAt: string;
}

export interface ClickEvent {
  id: string;
  trackedLinkId: string;
  createdAt: string;
  referrer: string | null;
  userAgent: string | null;
  ipHash: string;
  isLead: boolean;
}

export interface Payout {
  id: string;
  bookingId: string;
  amountCents: number;
  status: PayoutStatus;
  paidAt: string | null;
}
