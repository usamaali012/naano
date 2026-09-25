import type { MarketplaceCreator } from "@naano/shared";
import type { CreatorBookingInfo } from "../../lib/stores/bookingsStore";
import { Table, THead, TBody, TR, TH, TD } from "../ui/Table";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { StatusPill } from "../ui/StatusPill";
import { StarIcon } from "./icons";
import { bookingStatusLabel, bookingStatusTone } from "../../lib/bookingStatus";
import {
  formatCents,
  formatCompactNumber,
  formatCpm,
  verticalLabel,
} from "../../lib/format";

interface CreatorComparisonListProps {
  creators: MarketplaceCreator[];
  selectedIds: Set<string>;
  shortlistIds: Set<string>;
  bookingById: Record<string, CreatorBookingInfo>;
  /** The creator currently filling the persistent detail panel. */
  activeId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleShortlist: (id: string) => void;
  onSelect: (id: string) => void;
}

// Rows carry exactly the fields a brand compares creators on. Selecting a row
// (or its Book action) fills the persistent detail panel beside this list —
// no open/close step, unlike the card grid + modal this replaced. See
// docs/DECISIONS.md for the reasoning: comparing candidates is the brand's
// actual job on this screen, and a grid-plus-modal makes that one-at-a-time.
export function CreatorComparisonList({
  creators,
  selectedIds,
  shortlistIds,
  bookingById,
  activeId,
  onToggleSelect,
  onToggleShortlist,
  onSelect,
}: CreatorComparisonListProps): JSX.Element {
  return (
    <Table>
      <THead>
        <TR>
          <TH className="w-10" />
          <TH>Creator</TH>
          <TH className="text-right">Followers</TH>
          <TH className="text-right">Median views</TH>
          <TH className="text-right">CPM</TH>
          <TH className="text-right">Post cost</TH>
          <TH>Sector fit</TH>
          <TH>Status</TH>
          <TH className="w-10" />
          <TH className="w-10" />
        </TR>
      </THead>
      <TBody>
        {creators.map((creator) => {
          const active = creator.id === activeId;
          const shortlisted = shortlistIds.has(creator.id);
          const booking = bookingById[creator.id];
          return (
            <TR
              key={creator.id}
              onClick={() => onSelect(creator.id)}
              aria-selected={active}
              className={`cursor-pointer border-l-[3px] transition-colors ${
                active
                  ? "border-l-primary bg-primary-soft/50"
                  : "border-l-transparent hover:bg-bg"
              }`}
            >
              <TD onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  aria-label={`Select ${creator.displayName}`}
                  checked={selectedIds.has(creator.id)}
                  onChange={() => onToggleSelect(creator.id)}
                />
              </TD>
              <TD>
                <div className="flex items-center gap-s3">
                  <Avatar
                    src={creator.avatarUrl}
                    name={creator.displayName}
                    className="h-9 w-9 shrink-0"
                    initialsClassName="text-label"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-text">
                      {creator.displayName}
                    </p>
                    <p className="text-label text-text-muted">
                      {verticalLabel(creator.vertical)}
                      <span className="ml-s2">{creator.country}</span>
                    </p>
                  </div>
                </div>
              </TD>
              <TD className="text-right tabular-nums">
                {formatCompactNumber(creator.followerCount)}
              </TD>
              <TD className="text-right tabular-nums">
                {formatCompactNumber(creator.medianViews)}
              </TD>
              <TD className="text-right tabular-nums">
                {formatCpm(creator.postCostCents, creator.medianViews)}
              </TD>
              <TD className="text-right tabular-nums">
                {formatCents(creator.postCostCents)}
              </TD>
              <TD>
                {creator.sectorFitPct !== null ? (
                  <Badge>{creator.sectorFitPct}%</Badge>
                ) : (
                  <span className="text-label text-text-muted">—</span>
                )}
              </TD>
              <TD>
                {booking ? (
                  <div className="flex flex-col items-start gap-s1">
                    <StatusPill
                      tone={bookingStatusTone(booking.status)}
                      label={bookingStatusLabel(booking.status)}
                    />
                    {booking.clickCount !== null && (
                      <span className="tabular-nums text-label text-text-muted">
                        {booking.clickCount} clicks
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-label text-text-muted">—</span>
                )}
              </TD>
              <TD onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  aria-pressed={shortlisted}
                  aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                  onClick={() => onToggleShortlist(creator.id)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-control border border-border transition-colors hover:border-primary ${
                    shortlisted ? "text-primary" : "text-text-muted"
                  }`}
                >
                  <StarIcon className="h-4 w-4" filled={shortlisted} />
                </button>
              </TD>
              <TD onClick={(e) => e.stopPropagation()}>
                <Button size="sm" onClick={() => onSelect(creator.id)}>
                  Book
                </Button>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
