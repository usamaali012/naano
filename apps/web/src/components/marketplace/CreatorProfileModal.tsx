import { useEffect, useState } from "react";
import type { AudienceDimension, CreatorProfileDetail } from "@naano/shared";
import { cpmCents } from "@naano/shared";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { SegmentedBar } from "../ui/SegmentedBar";
import { StarIcon } from "./icons";
import { api } from "../../lib/api";
import {
  formatCents,
  formatCompactNumber,
  formatCpm,
  verticalLabel,
} from "../../lib/format";

interface CreatorProfileModalProps {
  creatorId: string | null;
  onClose: () => void;
  shortlisted: boolean;
  onToggleShortlist: (id: string) => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function segments(detail: CreatorProfileDetail, dimension: AudienceDimension) {
  return detail.audienceSegments
    .filter((segment) => segment.dimension === dimension)
    .map((segment) => ({ label: segment.label, percentage: segment.percentage }));
}

export function CreatorProfileModal({
  creatorId,
  onClose,
  shortlisted,
  onToggleShortlist,
}: CreatorProfileModalProps): JSX.Element {
  const [detail, setDetail] = useState<CreatorProfileDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    if (!creatorId) return;
    let cancelled = false;
    setStatus("loading");
    setDetail(null);
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

  const latestPost = detail?.posts[0];
  const cpm = detail ? cpmCents(detail.postCostCents, detail.medianViews) : 0;

  return (
    <Modal open={creatorId !== null} onClose={onClose} labelledBy="creator-profile-name">
      <div className="flex items-start justify-between gap-s4 border-b border-border p-s6">
        <div className="flex items-center gap-s4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-card-title text-primary">
            {detail ? initials(detail.displayName) : "—"}
          </span>
          <div>
            <h2 id="creator-profile-name" className="text-section-title text-text">
              {detail?.displayName ?? "Loading profile"}
            </h2>
            <p className="text-label text-text-muted">
              {detail
                ? `${verticalLabel(detail.vertical)} creator on ${
                    detail.network === "LINKEDIN" ? "LinkedIn" : "X"
                  }`
                : ""}
            </p>
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
      </div>

      {status === "loading" && (
        <p className="p-s6 text-body text-text-muted">Loading profile…</p>
      )}
      {status === "error" && (
        <p className="p-s6 text-body text-warn">
          Could not load this profile. Close and try again.
        </p>
      )}

      {status === "ready" && detail && (
        <div className="flex flex-col gap-s6 p-s6">
          <div className="flex items-center justify-between gap-s3">
            <p className="text-body text-text-muted">
              Review this creator&rsquo;s audience and recent content before booking.
            </p>
            {/* ICP fit is a marketplace-list value; the detail endpoint does not
                carry it, so it is not shown here. */}
          </div>

          <dl className="grid grid-cols-2 gap-s4 sm:grid-cols-4">
            {[
              ["Followers", formatCompactNumber(detail.followerCount)],
              ["Median views", formatCompactNumber(detail.medianViews)],
              ["CPM", formatCpm(detail.postCostCents, detail.medianViews)],
              ["Post cost", formatCents(detail.postCostCents)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-s1">
                <dd className="text-metric tabular-nums text-text">{value}</dd>
                <dt className="text-label text-text-muted">{label}</dt>
              </div>
            ))}
          </dl>

          <section className="flex flex-col gap-s4">
            <div className="flex items-baseline justify-between gap-s3">
              <h3 className="text-card-title text-text">Audience snapshot</h3>
              <span className="text-label text-text-muted">
                Estimated from {detail.observedEngagerCount} recent public engagers
              </span>
            </div>
            <div className="grid gap-s6 sm:grid-cols-2">
              <div className="flex flex-col gap-s3">
                <span className="text-label text-text-muted">Job title</span>
                <SegmentedBar segments={segments(detail, "JOB_TITLE")} />
              </div>
              <div className="flex flex-col gap-s3">
                <span className="text-label text-text-muted">Seniority</span>
                <SegmentedBar segments={segments(detail, "SENIORITY")} />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-s3">
            <h3 className="text-card-title text-text">Pricing</h3>
            <div className="flex flex-wrap gap-s3">
              <div className="rounded-control border border-border px-s4 py-s3">
                <div className="text-metric tabular-nums text-text">
                  {formatCents(detail.postCostCents)}
                </div>
                <div className="text-label text-text-muted">Single post</div>
              </div>
              <div className="rounded-control border border-border px-s4 py-s3">
                <div className="text-metric tabular-nums text-text">
                  {formatCents(detail.bundle5PriceCents)}
                </div>
                <div className="text-label text-text-muted">Bundle of 5</div>
              </div>
            </div>
            {cpm > 0 && (
              <p className="text-label text-text-muted">
                How CPM is calculated: {formatCents(detail.postCostCents)} ÷{" "}
                {formatCompactNumber(detail.medianViews)} median views × 1,000 ={" "}
                {formatCents(cpm)}.
              </p>
            )}
          </section>

          {latestPost && (
            <section className="flex flex-col gap-s3">
              <div className="flex items-baseline justify-between gap-s3">
                <h3 className="text-card-title text-text">Latest post</h3>
                <a
                  href={latestPost.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-label font-medium text-primary"
                >
                  Open original
                </a>
              </div>
              <p className="whitespace-pre-line text-body text-text">
                {latestPost.content}
              </p>
              <div className="flex flex-wrap gap-s4 text-label tabular-nums text-text-muted">
                <span>{formatCompactNumber(latestPost.views)} views</span>
                <span>{formatCompactNumber(latestPost.reactions)} reactions</span>
                <span>{formatCompactNumber(latestPost.comments)} comments</span>
                <span>{formatCompactNumber(latestPost.reposts)} reposts</span>
              </div>
              <p className="text-label text-text-muted">
                {detail.postsAnalyzed} recent posts analysed for these signals.
              </p>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
