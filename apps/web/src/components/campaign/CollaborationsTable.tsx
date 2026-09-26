import { useState } from "react";
import type { BrandCollaboration } from "@naano/shared";
import { Table, THead, TBody, TR, TH, TD } from "../ui/Table";
import { Button } from "../ui/Button";
import { StatusPill } from "../ui/StatusPill";
import { bookingStatusLabel, bookingStatusTone } from "../../lib/bookingStatus";
import { trackedLinkUrl } from "../../lib/trackedLink";
import { formatCents } from "../../lib/format";

// Package isn't a stored column — BookingSent derives it server-side by
// comparing agreedPriceCents against the creator's own bundle5PriceCents.
// See docs/DECISIONS.md.
const PACKAGE_LABELS: Record<BrandCollaboration["package"], string> = {
  single: "Single post",
  bundle: "Bundle of 5",
};

interface CollaborationsTableProps {
  bookings: BrandCollaboration[];
  busyId: string | null;
  errors: Record<string, string>;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string) => void;
  onMarkPaid: (id: string) => void;
}

export function CollaborationsTable({
  bookings,
  busyId,
  errors,
  onApprove,
  onRequestChanges,
  onMarkPaid,
}: CollaborationsTableProps): JSX.Element {
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
          <TH>Next action</TH>
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
            <TD className="min-w-[220px] max-w-xs">
              <NextActionCell
                booking={booking}
                busy={busyId === booking.id}
                error={errors[booking.id] ?? null}
                onApprove={() => onApprove(booking.id)}
                onRequestChanges={() => onRequestChanges(booking.id)}
                onMarkPaid={() => onMarkPaid(booking.id)}
              />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

// The same idea as the creator's CollaborationCard: a tinted panel when the
// next move is the brand's (consequence non-empty), a plain muted line
// otherwise. See docs/DECISIONS.md.
function NextActionCell({
  booking,
  busy,
  error,
  onApprove,
  onRequestChanges,
  onMarkPaid,
}: {
  booking: BrandCollaboration;
  busy: boolean;
  error: string | null;
  onApprove: () => void;
  onRequestChanges: () => void;
  onMarkPaid: () => void;
}): JSX.Element {
  const { nextAction } = booking;
  if (nextAction.consequence === "") {
    return <span className="text-label text-text-muted">{nextAction.label}</span>;
  }

  return (
    <div className="flex flex-col gap-s2 rounded-control bg-primary-soft p-s3">
      <p className="text-body font-medium text-primary">{nextAction.label}</p>
      <p className="text-label text-text-muted">{nextAction.consequence}</p>

      {nextAction.kind === "review_draft" && (
        <>
          {booking.draftContent && (
            <p className="line-clamp-3 whitespace-pre-wrap text-label text-text">
              {booking.draftContent}
            </p>
          )}
          <div className="flex gap-s2 pt-s1">
            <Button size="sm" disabled={busy} onClick={onApprove}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={onRequestChanges}>
              Ask for changes
            </Button>
          </div>
        </>
      )}

      {nextAction.kind === "mark_paid" && (
        <>
          {booking.postUrl && (
            <a
              href={booking.postUrl}
              target="_blank"
              rel="noreferrer"
              className="text-label font-medium text-primary underline"
            >
              View the live post
            </a>
          )}
          <div className="pt-s1">
            <Button size="sm" disabled={busy} onClick={onMarkPaid}>
              Mark as paid ({formatCents(booking.agreedPriceCents)})
            </Button>
          </div>
          <p className="text-label text-text-muted">
            Payment rails aren&rsquo;t built. This records a payment you made
            outside naano.
          </p>
        </>
      )}

      {error && <p className="text-label text-warn">{error}</p>}
    </div>
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
