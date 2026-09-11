import { useState } from "react";
import type { BookingSent } from "@naano/shared";
import { Table, THead, TBody, TR, TH, TD } from "../ui/Table";
import { StatusPill } from "../ui/StatusPill";
import { bookingStatusLabel, bookingStatusTone } from "../../lib/bookingStatus";
import { trackedLinkUrl } from "../../lib/trackedLink";
import { formatCents } from "../../lib/format";

// Package isn't a stored column — BookingSent derives it server-side by
// comparing agreedPriceCents against the creator's own bundle5PriceCents.
// See docs/DECISIONS.md.
const PACKAGE_LABELS: Record<BookingSent["package"], string> = {
  single: "Single post",
  bundle: "Bundle of 5",
};

interface CollaborationsTableProps {
  bookings: BookingSent[];
}

export function CollaborationsTable({ bookings }: CollaborationsTableProps): JSX.Element {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Creator</TH>
          <TH>Campaign</TH>
          <TH>Package</TH>
          <TH className="text-right">Agreed price</TH>
          <TH>Status</TH>
          <TH>Tracked link</TH>
        </TR>
      </THead>
      <TBody>
        {bookings.map((booking) => (
          <TR key={booking.id}>
            <TD className="font-medium text-text">{booking.creatorDisplayName}</TD>
            <TD>{booking.campaignName}</TD>
            <TD>{PACKAGE_LABELS[booking.package]}</TD>
            <TD className="text-right tabular-nums">
              {formatCents(booking.agreedPriceCents)}
            </TD>
            <TD>
              <StatusPill
                tone={bookingStatusTone(booking.status)}
                label={bookingStatusLabel(booking.status)}
              />
            </TD>
            <TD>
              {booking.trackedLinkSlug ? (
                <TrackedLinkCell
                  slug={booking.trackedLinkSlug}
                  clickCount={booking.clickCount ?? 0}
                />
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

// A tracked link exists once a booking is accepted (or beyond — seed can
// place a booking directly at SCHEDULED/LIVE/PAID, all of which already have
// one), so this gates on the link itself rather than on status === ACCEPTED.
function TrackedLinkCell({
  slug,
  clickCount,
}: {
  slug: string;
  clickCount: number;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  const url = trackedLinkUrl(slug);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the link is still visible via the URL.
    }
  }

  return (
    <div className="flex items-center gap-s3">
      <span className="tabular-nums text-text">{clickCount} clicks</span>
      <button
        type="button"
        onClick={() => void copy()}
        className="text-label font-medium text-primary"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
