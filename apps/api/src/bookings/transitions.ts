import type { BookingStatus } from "@naano/shared";

/**
 * The five lifecycle actions this round added (accept/decline predate this
 * and stay in `BookingsService.updateStatus`, unchanged). Pure, no Prisma —
 * the service checks a booking's current status against `from` and 409s with
 * a human sentence built from `STATUS_LABEL` when it doesn't match, instead
 * of repeating the same status literals in five separate guards.
 */
export type BookingAction = "draft" | "publish" | "approve" | "requestChanges" | "markPaid";

export interface Transition {
  role: "CREATOR" | "COMPANY";
  from: BookingStatus;
  to: BookingStatus;
}

export const TRANSITIONS: Record<BookingAction, Transition> = {
  draft: { role: "CREATOR", from: "ACCEPTED", to: "DRAFT_READY" },
  approve: { role: "COMPANY", from: "DRAFT_READY", to: "SCHEDULED" },
  requestChanges: { role: "COMPANY", from: "DRAFT_READY", to: "ACCEPTED" },
  publish: { role: "CREATOR", from: "SCHEDULED", to: "LIVE" },
  markPaid: { role: "COMPANY", from: "LIVE", to: "PAID" },
};

/** How a booking's current status reads in a sentence, e.g. "live", "in draft review". */
const STATUS_LABEL: Record<BookingStatus, string> = {
  INVITED: "invited",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  DRAFT_READY: "in draft review",
  SCHEDULED: "scheduled",
  LIVE: "live",
  PAID: "paid",
};

/** How the action reads as a past participle, e.g. "approved", "marked paid". */
const ACTION_VERB: Record<BookingAction, string> = {
  draft: "drafted",
  approve: "approved",
  requestChanges: "sent back for changes",
  publish: "published",
  markPaid: "marked paid",
};

/** "This booking is live, so it can't be approved." */
export function wrongStateMessage(action: BookingAction, current: BookingStatus): string {
  return `This booking is ${STATUS_LABEL[current]}, so it can't be ${ACTION_VERB[action]}.`;
}
