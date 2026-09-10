// Wire-shape types, derived from prisma/schema.prisma. Dates are ISO strings
// (JSON has no Date type); money is always integer cents.

import type {
  AudienceDimension,
  BookingInitiator,
  BookingStatus,
  CampaignStatus,
  Network,
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
  network: Network;
  followerCount: number;
  country: string;
  language: string;
  /** What the brand pays for one post, integer cents. */
  postCostCents: number;
  /** Price for a bundle of five posts, integer cents. */
  bundle5PriceCents: number;
  /** Verified median views per post. CPM derives from this; see cpmFromCents. */
  medianViews: number;
  /** Public engagers sampled to build the audience breakdown. */
  observedEngagerCount: number;
  /** Recent posts inspected for the content signals. */
  postsAnalyzed: number;
  engagementRate: number;
  createdAt: string;
}

export interface AudienceSegment {
  id: string;
  creatorProfileId: string;
  dimension: AudienceDimension;
  label: string;
  percentage: number;
  createdAt: string;
}

export interface CreatorPost {
  id: string;
  creatorProfileId: string;
  network: Network;
  content: string;
  publishedAt: string;
  views: number;
  reactions: number;
  comments: number;
  reposts: number;
  externalUrl: string;
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
  /** The buyer vertical this campaign targets. Drives per-campaign sector fit. */
  targetVertical: Vertical;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface Icp {
  id: string;
  campaignId: string;
  rank: number;
  title: string;
  description: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  campaignId: string;
  creatorProfileId: string;
  agreedPriceCents: number;
  status: BookingStatus;
  initiatedBy: BookingInitiator;
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
