import { useEffect, useState } from "react";
import type { CreatorProfileDetail } from "@naano/shared";
import { Modal } from "../ui/Modal";
import { Tabs } from "../ui/Tabs";
import { StarIcon } from "./icons";
import { OverviewTab } from "./modal/OverviewTab";
import { AudienceTab } from "./modal/AudienceTab";
import { BookingRail } from "./modal/BookingRail";
import { api } from "../../lib/api";
import { verticalLabel } from "../../lib/format";

interface CreatorProfileModalProps {
  creatorId: string | null;
  onClose: () => void;
  shortlisted: boolean;
  onToggleShortlist: (id: string) => void;
}

type ModalTab = "overview" | "audience";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function CreatorProfileModal({
  creatorId,
  onClose,
  shortlisted,
  onToggleShortlist,
}: CreatorProfileModalProps): JSX.Element {
  const [detail, setDetail] = useState<CreatorProfileDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [tab, setTab] = useState<ModalTab>("overview");

  useEffect(() => {
    if (!creatorId) return;
    let cancelled = false;
    setStatus("loading");
    setDetail(null);
    setTab("overview");
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

  const roleLine = detail
    ? `${verticalLabel(detail.vertical)} creator on ${
        detail.network === "LINKEDIN" ? "LinkedIn" : "X"
      }`
    : "";

  return (
    <Modal
      open={creatorId !== null}
      onClose={onClose}
      labelledBy="creator-profile-name"
      className="flex max-h-[calc(100vh-3rem)] !max-w-[1080px] flex-col overflow-hidden"
    >
      <header className="flex shrink-0 items-start justify-between gap-s4 border-b border-border p-s6">
        <div className="flex items-center gap-s4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-card-title text-primary">
            {detail ? initials(detail.displayName) : "—"}
          </span>
          <div>
            <h2 id="creator-profile-name" className="text-section-title text-text">
              {detail?.displayName ?? "Loading profile"}
            </h2>
            <p className="text-label text-text-muted">{roleLine}</p>
          </div>
        </div>
        <div className="flex items-center gap-s2">
          {detail && (
            <button
              type="button"
              aria-pressed={shortlisted}
              aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
              onClick={() => onToggleShortlist(detail.id)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-control border border-border transition-colors hover:border-primary ${
                shortlisted ? "text-primary" : "text-text-muted"
              }`}
            >
              <StarIcon className="h-4 w-4" filled={shortlisted} />
            </button>
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-border text-text-muted transition-colors hover:border-primary"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {status === "loading" && (
        <p className="p-s6 text-body text-text-muted">Loading profile…</p>
      )}
      {status === "error" && (
        <p className="p-s6 text-body text-warn">
          Could not load this profile. Close and try again.
        </p>
      )}

      {status === "ready" && detail && (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="shrink-0 px-s6">
              <Tabs
                value={tab}
                onChange={(value) => setTab(value as ModalTab)}
                items={[
                  { value: "overview", label: "Overview" },
                  { value: "audience", label: "Audience" },
                ]}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-s6">
              {tab === "overview" ? (
                <OverviewTab creator={detail} />
              ) : (
                <AudienceTab creator={detail} />
              )}
            </div>
          </div>

          <aside className="shrink-0 overflow-y-auto border-t border-border bg-bg p-s6 lg:w-[320px] lg:border-l lg:border-t-0">
            <BookingRail creator={detail} />
          </aside>
        </div>
      )}
    </Modal>
  );
}
