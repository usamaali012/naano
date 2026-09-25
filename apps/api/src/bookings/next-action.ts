import type { BookingStatus, NextAction } from "@naano/shared";

/**
 * What the creator should do next with a booking, from status alone. Pure —
 * no Prisma, no I/O. `consequence` is scoped to the creator's own inaction:
 * it's empty whenever the next move belongs to the brand, not just whenever
 * the booking is "done".
 */
export function nextActionForStatus(status: BookingStatus): NextAction {
  switch (status) {
    case "INVITED":
      return {
        kind: "respond",
        label: "Accept or decline this invitation.",
        consequence:
          "Nothing moves until you respond — the brand's invitation stays pending.",
      };
    case "ACCEPTED":
      return {
        kind: "publish",
        label: "Publish the post using your tracked link.",
        consequence:
          "The brand is waiting on your post — nothing else happens until you publish.",
      };
    case "DRAFT_READY":
      return {
        kind: "await_brand",
        label: "Wait for the brand to review your draft.",
        consequence: "",
      };
    case "SCHEDULED":
      return {
        kind: "await_brand",
        label: "Wait for your scheduled post to go live.",
        consequence: "",
      };
    case "LIVE":
    case "PAID":
    case "DECLINED":
      return { kind: "none", label: "Nothing to do.", consequence: "" };
  }
}
