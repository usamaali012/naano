import { BookingStatus as PrismaBookingStatus } from "@prisma/client";
import type { BookingStatus } from "@naano/shared";
import { nextActionFor } from "./next-action";

type Viewer = "CREATOR" | "COMPANY";

const ALL_STATUSES = Object.values(PrismaBookingStatus) as BookingStatus[];

/**
 * Every status where `nextActionFor`'s consequence is non-empty for this
 * viewer, for either value of `hasDraft`. Derived from `nextActionFor` itself
 * so `/bookings/action-count` can never drift from what "Next action" shows.
 */
export function actionableStatusesFor(viewer: Viewer): BookingStatus[] {
  return ALL_STATUSES.filter((status) =>
    [true, false].some((hasDraft) => nextActionFor(status, viewer, hasDraft).consequence !== ""),
  );
}
