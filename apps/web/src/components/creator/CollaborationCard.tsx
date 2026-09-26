import { useState } from "react";
import type { BookingStatus, CreatorCollaboration } from "@naano/shared";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { StatusPill } from "../ui/StatusPill";
import { TrackedLinkRow } from "./TrackedLinkRow";
import { bookingStatusLabel, bookingStatusTone } from "../../lib/bookingStatus";
import { formatCents } from "../../lib/format";

const DRAFT_MAX_LENGTH = 3000;

interface CollaborationCardProps {
  booking: CreatorCollaboration;
  busy: boolean;
  error: string | null;
  onRespond: (id: string, status: Extract<BookingStatus, "ACCEPTED" | "DECLINED">) => void;
  onSubmitDraft: (id: string, content: string) => void;
  onPublish: (id: string, postUrl: string) => void;
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
  busy,
  error,
  onRespond,
  onSubmitDraft,
  onPublish,
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
                disabled={busy}
                onClick={() => onRespond(booking.id, "ACCEPTED")}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => onRespond(booking.id, "DECLINED")}
              >
                Decline
              </Button>
            </div>
          )}
          {nextAction.kind === "submit_draft" && (
            <SubmitDraftForm
              initialContent={booking.draftContent ?? ""}
              busy={busy}
              onSubmit={(content) => onSubmitDraft(booking.id, content)}
            />
          )}
          {nextAction.kind === "publish" && (
            <PublishForm
              slug={booking.trackedLinkSlug}
              busy={busy}
              onSubmit={(postUrl) => onPublish(booking.id, postUrl)}
            />
          )}
          {error && <p className="text-label text-warn">{error}</p>}
        </div>
      ) : (
        // Informational, not actionable — a plain line, deliberately without
        // the tinted panel above, so the two states read as different at a
        // glance rather than the same box in a different colour.
        <p className="text-label text-text-muted">{nextAction.label}</p>
      )}

      <p className="text-body text-text-muted">{booking.deliverable}</p>

      {booking.trackedLinkSlug && nextAction.kind !== "publish" && (
        <TrackedLinkRow slug={booking.trackedLinkSlug} />
      )}
    </li>
  );
}

function SubmitDraftForm({
  initialContent,
  busy,
  onSubmit,
}: {
  initialContent: string;
  busy: boolean;
  onSubmit: (content: string) => void;
}): JSX.Element {
  const [content, setContent] = useState(initialContent);
  const trimmed = content.trim();
  const overLimit = content.length > DRAFT_MAX_LENGTH;
  const canSend = trimmed.length > 0 && !overLimit && !busy;

  return (
    <div className="flex flex-col gap-s2 pt-s1">
      <textarea
        value={content}
        disabled={busy}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        className={`w-full rounded-control border bg-surface px-s4 py-s3 text-body text-text placeholder:text-text-muted transition-shadow focus:outline-none focus:shadow-[0_0_0_3px_var(--primary-soft)] ${
          overLimit ? "border-warn focus:border-warn" : "border-border focus:border-primary"
        }`}
        placeholder="Write the post you'll publish for this brand."
      />
      <span className={`text-label ${overLimit ? "text-warn" : "text-text-muted"}`}>
        {content.length} / {DRAFT_MAX_LENGTH}
      </span>
      <div>
        <Button size="sm" disabled={!canSend} onClick={() => onSubmit(trimmed)}>
          Send for review
        </Button>
      </div>
    </div>
  );
}

function PublishForm({
  slug,
  busy,
  onSubmit,
}: {
  slug: string | null;
  busy: boolean;
  onSubmit: (postUrl: string) => void;
}): JSX.Element {
  const [postUrl, setPostUrl] = useState("");
  const canPublish = postUrl.trim().length > 0 && !busy;

  return (
    <div className="flex flex-col gap-s3 pt-s1">
      {slug && <TrackedLinkRow slug={slug} />}
      <div className="flex flex-col gap-s2">
        <label htmlFor={`post-url-${slug ?? "new"}`} className="text-label text-text-muted">
          Post URL
        </label>
        <Input
          id={`post-url-${slug ?? "new"}`}
          value={postUrl}
          disabled={busy}
          placeholder="https://www.linkedin.com/..."
          onChange={(e) => setPostUrl(e.target.value)}
        />
      </div>
      <div>
        <Button size="sm" disabled={!canPublish} onClick={() => onSubmit(postUrl.trim())}>
          Mark as published
        </Button>
      </div>
    </div>
  );
}
