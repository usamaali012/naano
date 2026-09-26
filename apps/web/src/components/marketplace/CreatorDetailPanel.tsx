import { useEffect, useRef, useState } from "react";
import type { CampaignOverview, CreatorProfileDetail } from "@naano/shared";
import { Avatar } from "../ui/Avatar";
import { Card } from "../ui/Card";
import { Tabs } from "../ui/Tabs";
import { StarIcon } from "./icons";
import { OverviewTab } from "./modal/OverviewTab";
import { AudienceTab } from "./modal/AudienceTab";
import { BookingRail } from "./modal/BookingRail";
import { api } from "../../lib/api";
import { verticalLabel } from "../../lib/format";

interface CreatorDetailPanelProps {
  creatorId: string | null;
  shortlisted: boolean;
  onToggleShortlist: (id: string) => void;
  /** The campaign the marketplace is ranked for; a booking is created against it. */
  campaign: CampaignOverview | null;
}

type PanelTab = "overview" | "audience";

// The persistent right-hand pane beside the comparison list. Selecting a row,
// or paging/filtering the list out from under the current selection, swaps
// this pane's contents in place — no open or close step, unlike the modal it
// replaced (docs/DECISIONS.md). Overview and Audience below are the former
// CreatorProfileModal's tabs, relocated close to unchanged; the booking rail
// moves from a side column to a stacked section, because a 1080px modal had
// room for two columns and this ~440px pane doesn't.
//
// The wrapping element in CreatorsListPage sizes and positions this panel
// (sticky, height capped to the list column or the viewport, whichever is
// shorter — W6, docs/DECISIONS.md). This component just fills that box: the
// header stays put (shrink-0) while everything below it — tabs, tab content,
// the booking rail — scrolls in its own region, independent of the page.
export function CreatorDetailPanel({
  creatorId,
  shortlisted,
  onToggleShortlist,
  campaign,
}: CreatorDetailPanelProps): JSX.Element {
  const [detail, setDetail] = useState<CreatorProfileDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [tab, setTab] = useState<PanelTab>("overview");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!creatorId) return;
    let cancelled = false;
    setStatus("loading");
    setDetail(null);
    setTab("overview");
    // Selecting another row always starts the panel scrolled to the top,
    // even if it was mid-scroll on the previous creator's booking rail.
    scrollRef.current?.scrollTo({ top: 0 });
    api
      .getCreator(creatorId)
      .then((result) => {
        if (cancelled) return;
        setDetail(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  if (!creatorId) {
    return (
      <Card className="text-body text-text-muted">
        Select a creator from the list to compare their profile and start a
        booking.
      </Card>
    );
  }

  const roleLine = detail
    ? `${verticalLabel(detail.vertical)} creator on ${
        detail.network === "LINKEDIN" ? "LinkedIn" : "X"
      }`
    : "";

  return (
    <div className="flex h-full min-h-0 flex-col rounded-card border border-border bg-surface">
      <header className="flex shrink-0 items-start justify-between gap-s4 border-b border-border p-s6">
        <div className="flex min-w-0 items-center gap-s4">
          <Avatar
            src={detail?.avatarUrl ?? null}
            name={detail?.displayName ?? "—"}
            className="h-12 w-12 shrink-0"
          />
          <div className="min-w-0">
            <h2 className="truncate text-section-title text-text">
              {detail?.displayName ?? "Loading profile"}
            </h2>
            <p className="text-label text-text-muted">{roleLine}</p>
          </div>
        </div>
        {detail && (
          <button
            type="button"
            aria-pressed={shortlisted}
            aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
            onClick={() => onToggleShortlist(detail.id)}
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border transition-colors hover:border-primary ${
              shortlisted ? "text-primary" : "text-text-muted"
            }`}
          >
            <StarIcon className="h-4 w-4" filled={shortlisted} />
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-s6 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
      >
        <div className="flex flex-col gap-s6">
          {status === "loading" && (
            <p className="text-body text-text-muted">Loading profile…</p>
          )}
          {status === "error" && (
            <p className="text-body text-warn">
              Could not load this profile. Select it again to retry.
            </p>
          )}

          {status === "ready" && detail && (
            <>
              <Tabs
                value={tab}
                onChange={(value) => setTab(value as PanelTab)}
                items={[
                  { value: "overview", label: "Overview" },
                  { value: "audience", label: "Audience" },
                ]}
              />
              {tab === "overview" ? (
                <OverviewTab creator={detail} />
              ) : (
                <AudienceTab creator={detail} />
              )}
              <div className="border-t border-border pt-s6">
                <BookingRail creator={detail} campaign={campaign} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
