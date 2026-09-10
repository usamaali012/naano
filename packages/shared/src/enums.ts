// Mirrors the enums in apps/api/prisma/schema.prisma. Prisma generates its own
// copies for the API; this is the wire-safe version shared with the web app.

export type Role = "COMPANY" | "CREATOR" | "ADMIN";

export type Vertical =
  | "SALES"
  | "REVOPS"
  | "DEVTOOLS"
  | "HR_TECH"
  | "PRODUCT"
  | "MARKETING_OPS"
  | "FINTECH"
  | "VERTICAL_SAAS";

export type Network = "LINKEDIN" | "X";

export type CampaignStatus = "DRAFT" | "LIVE" | "COMPLETED";

export type BookingInitiator = "BRAND" | "CREATOR";

export type AudienceDimension =
  | "JOB_TITLE"
  | "SENIORITY"
  | "INDUSTRY"
  | "GEOGRAPHY";

export type BookingStatus =
  | "INVITED"
  | "ACCEPTED"
  | "DECLINED"
  | "DRAFT_READY"
  | "SCHEDULED"
  | "LIVE"
  | "PAID";

export type PayoutStatus = "PENDING" | "PAID" | "FAILED";
