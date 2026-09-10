import type { MarketplaceCreator } from "@naano/shared";
import type { CreatorBookingInfo } from "../../lib/stores/bookingsStore";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Checkbox } from "../ui/Checkbox";
import { StatusPill } from "../ui/StatusPill";
import { NetworkBadge, StarIcon } from "./icons";
import { bookingStatusLabel, bookingStatusTone } from "../../lib/bookingStatus";
import {
  formatCents,
  formatCompactNumber,
  formatCpm,
  verticalLabel,
} from "../../lib/format";

interface CreatorCardProps {
  creator: MarketplaceCreator;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  shortlisted: boolean;
  onToggleShortlist: (id: string) => void;
  onOpen: (id: string) => void;
  /** A booking already exists for this creator against the active campaign. */
  booking?: CreatorBookingInfo;
}

interface Metric {
  label: string;
  value: string;
}

export function CreatorCard({
  creator,
  selected,
  onToggleSelect,
  shortlisted,
  onToggleShortlist,
  onOpen,
  booking,
}: CreatorCardProps): JSX.Element {
  // Order is fixed by RECON §4: followers, median views, CPM, post cost.
  const metrics: Metric[] = [
    { label: "Followers", value: formatCompactNumber(creator.followerCount) },
    { label: "Median views", value: formatCompactNumber(creator.medianViews) },
    { label: "CPM", value: formatCpm(creator.postCostCents, creator.medianViews) },
    { label: "Post cost", value: formatCents(creator.postCostCents) },
  ];

  return (
    <Card interactive className="flex flex-col !p-0">
      <div className="flex items-center justify-between px-s4 py-s3">
        <div className="flex items-center gap-s3">
          <Checkbox
            aria-label={`Select ${creator.displayName}`}
            checked={selected}
            onChange={() => onToggleSelect(creator.id)}
          />
          <NetworkBadge network={creator.network} />
        </div>
        <div className="flex items-center gap-s2">
          {creator.sectorFitPct !== null && (
            <Badge>{creator.sectorFitPct}% sector fit</Badge>
          )}
          {booking && (
            <StatusPill
              tone={bookingStatusTone(booking.status)}
              label={bookingStatusLabel(booking.status)}
            />
          )}
          {booking?.clickCount !== null && booking?.clickCount !== undefined && (
            <span className="tabular-nums text-label text-text-muted">
              {booking.clickCount} clicks
            </span>
          )}
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
          <Button size="sm" onClick={() => onOpen(creator.id)}>
            Book
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-s4 border-t border-border px-s4 pb-s4 pt-s4">
        <div className="flex items-center gap-s3">
          <Avatar
            src={creator.avatarUrl}
            name={creator.displayName}
            className="h-14 w-14"
          />
          <div>
            <h3 className="text-card-title text-text">{creator.displayName}</h3>
            <p className="mt-s1 text-label text-text-muted">
              {verticalLabel(creator.vertical)}
              <span className="ml-s2">{creator.country}</span>
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-4 gap-s2 border-t border-border pt-s3">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex flex-col gap-s1">
              <dd className="text-metric tabular-nums text-text">{metric.value}</dd>
              <dt className="text-label text-text-muted">{metric.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <button
        type="button"
        onClick={() => onOpen(creator.id)}
        className="rounded-b-card border-t border-border px-s4 py-s3 text-left text-body font-medium text-primary transition-colors hover:bg-primary-soft"
      >
        View profile
      </button>
    </Card>
  );
}
