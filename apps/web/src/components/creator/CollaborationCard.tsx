import type { BookingStatus, CreatorCollaboration } from "@naano/shared";
import { Button } from "../ui/Button";
import { StatusPill } from "../ui/StatusPill";
import { TrackedLinkRow } from "./TrackedLinkRow";
import { bookingStatusLabel, bookingStatusTone } from "../../lib/bookingStatus";
import { formatCents } from "../../lib/format";

interface CollaborationCardProps {
  booking: CreatorCollaboration;
  responding: boolean;
  onRespond: (id: string, status: Extract<BookingStatus, "ACCEPTED" | "DECLINED">) => void;
}

// One collaboration, organised around next action rather than status alone —
// naano buries this idea in a table's sixth column ("Next action"); here it
// is the first and most prominent thing the card says, styled differently
// depending on whether `nextAction.consequence` is non-empty. That string is
// empty exactly when the next move belongs to the brand, so its presence is
// what decides whether this row is asking the creator for something or just
// keeping them informed — not the booking status by itself. See
// docs/DECISIONS.md.
export function CollaborationCard({
  booking,
  responding,
  onRespond,
}: CollaborationCardProps): JSX.Element {
  const { nextAction } = booking;
  const actionable = nextAction.consequence !== "";

  return (
    <li className="flex flex-col gap-s4 rounded-card border border-border p-s4">
      <div className="flex flex-wrap items-start justify-between gap-s3">
        <div className="flex flex-col gap-s1">
          <div className="flex flex-wrap items-center gap-s2">
            <span className="text-card-title text-text">{booking.companyName}</span>
            <StatusPill
              tone={bookingStatusTone(booking.status)}
              label={bookingStatusLabel(booking.status)}
            />
          </div>
          <p className="text-label text-text-muted">{booking.campaignName}</p>
        </div>
        <div className="flex flex-col items-end gap-s1 text-right">
          <span className="text-metric tabular-nums text-text">
            {formatCents(booking.netCents)}
          </span>
          <span className="text-label text-text-muted">your net</span>
        </div>
      </div>

      {actionable ? (
        <div className="flex flex-col gap-s2 rounded-control bg-primary-soft p-s3">
          <p className="text-body font-medium text-primary">{nextAction.label}</p>
          <p className="text-label text-text-muted">{nextAction.consequence}</p>
          {nextAction.kind === "respond" && (
            <div className="flex gap-s2 pt-s1">
              <Button
                size="sm"
                disabled={responding}
                onClick={() => onRespond(booking.id, "ACCEPTED")}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={responding}
                onClick={() => onRespond(booking.id, "DECLINED")}
              >
                Decline
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Informational, not actionable — a plain line, deliberately without
        // the tinted panel above, so the two states read as different at a
        // glance rather than the same box in a different colour.
        <p className="text-label text-text-muted">{nextAction.label}</p>
      )}

      <p className="text-body text-text-muted">{booking.deliverable}</p>

      {booking.trackedLinkSlug && <TrackedLinkRow slug={booking.trackedLinkSlug} />}
    </li>
  );
}
