import type { BookingStatus, NextAction } from "@naano/shared";

type Viewer = "CREATOR" | "COMPANY";

/**
 * What the viewer should do next with a booking, from status + role alone.
 * Pure — no Prisma, no I/O. `hasDraft` distinguishes a first submission from
 * a resubmission after the brand asked for changes (both land on ACCEPTED,
 * since request-changes sends DRAFT_READY back to ACCEPTED) — the copy
 * differs even though the transition doesn't.
 */
export function nextActionFor(
  status: BookingStatus,
  viewer: Viewer,
  hasDraft: boolean,
): NextAction {
  if (viewer === "CREATOR") {
    switch (status) {
      case "INVITED":
        return {
          kind: "respond",
          label: "Accept or decline this invitation.",
          consequence: "Nothing moves until you respond. The brand's invitation stays pending.",
        };
      case "ACCEPTED":
        return {
          kind: "submit_draft",
          label: hasDraft
            ? "The brand asked for changes. Revise your draft and send it again."
            : "Write your post and send it to the brand for review.",
          consequence: "The brand can't approve anything until your draft arrives.",
        };
      case "DRAFT_READY":
        return {
          kind: "await_brand",
          label: "Wait for the brand to review your draft.",
          consequence: "",
        };
      case "SCHEDULED":
        return {
          kind: "publish",
          label: "Your draft is approved. Publish it with your tracked link, then add the post URL here.",
          consequence: "The brand can't pay you until the post is live.",
        };
      case "LIVE":
        return {
          kind: "await_brand",
          label: "Wait for the brand to confirm payment.",
          consequence: "",
        };
      case "PAID":
      case "DECLINED":
        return { kind: "none", label: "Nothing to do.", consequence: "" };
    }
  }

  switch (status) {
    case "INVITED":
      return {
        kind: "await_creator",
        label: "Waiting for the creator to accept.",
        consequence: "",
      };
    case "ACCEPTED":
      return {
        kind: "await_creator",
        label: hasDraft
          ? "Waiting for the creator's revised draft."
          : "Waiting for the creator's draft.",
        consequence: "",
      };
    case "DRAFT_READY":
      return {
        kind: "review_draft",
        label: "Review the draft. Approve it or ask for changes.",
        consequence: "The creator can't publish until you decide.",
      };
    case "SCHEDULED":
      return {
        kind: "await_creator",
        label: "Waiting for the creator to publish.",
        consequence: "",
      };
    case "LIVE":
      return {
        kind: "mark_paid",
        label: "The post is live. Record that you've paid the creator.",
        consequence: "The creator's earnings stay in transit until you confirm.",
      };
    case "PAID":
    case "DECLINED":
      return { kind: "none", label: "Nothing to do.", consequence: "" };
  }
}
