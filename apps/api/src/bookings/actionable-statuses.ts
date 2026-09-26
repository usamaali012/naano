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

/**
 * Rows whose status is in `actionableStatuses` first, createdAt desc within
 * each group. Prisma can't order by this derived flag, so callers sort here
 * before paginating — see `bookings.service.ts`'s `listReceived`/`listSent`.
 */
export function actionableFirst<T extends { status: BookingStatus; createdAt: Date }>(
  rows: readonly T[],
  actionableStatuses: readonly BookingStatus[],
): T[] {
  const actionable = new Set(actionableStatuses);
  return [...rows].sort((a, b) => {
    const diff = Number(actionable.has(b.status)) - Number(actionable.has(a.status));
    return diff !== 0 ? diff : b.createdAt.getTime() - a.createdAt.getTime();
  });
}
