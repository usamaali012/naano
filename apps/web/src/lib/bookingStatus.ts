import type { BookingStatus } from "@naano/shared";

type StatusTone = "success" | "warn" | "neutral";

const LABELS: Record<BookingStatus, string> = {
  INVITED: "Invited",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  DRAFT_READY: "Draft ready",
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  PAID: "Paid",
};

const TONES: Record<BookingStatus, StatusTone> = {
  INVITED: "neutral",
  ACCEPTED: "success",
  DECLINED: "warn",
  DRAFT_READY: "neutral",
  SCHEDULED: "success",
  LIVE: "success",
  PAID: "success",
};

export function bookingStatusLabel(status: BookingStatus): string {
  return LABELS[status];
}

export function bookingStatusTone(status: BookingStatus): StatusTone {
  return TONES[status];
}
