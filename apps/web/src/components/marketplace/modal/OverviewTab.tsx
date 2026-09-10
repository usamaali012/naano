import { useState } from "react";
import type { ReactNode } from "react";
import type { CreatorProfileDetail } from "@naano/shared";
import { SegmentedBar } from "../../ui/SegmentedBar";
import { Disclosure } from "../../ui/Disclosure";
import { ReachSparkline } from "./ReachSparkline";
import { segmentsFor } from "./audienceSegments";
import {
  formatCompactNumber,
  formatPercent,
  verticalLabel,
} from "../../../lib/format";

interface OverviewTabProps {
  creator: CreatorProfileDetail;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function CheckChip({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-s2 rounded-control bg-primary-soft px-s3 py-s1 text-label text-primary">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          d="M3.5 8.5l3 3 6-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </span>
  );
}

export function OverviewTab({ creator }: OverviewTabProps): JSX.Element {
  const [postExpanded, setPostExpanded] = useState(false);
  const jobTitle = segmentsFor(creator, "JOB_TITLE");
  const seniority = segmentsFor(creator, "SENIORITY");
  const topJob = jobTitle[0];
  const recentPost = creator.posts[0];

  return (
    <div className="flex flex-col gap-s6">
      <div className="flex flex-col gap-s3">
        <h3 className="text-card-title text-text">Creator overview</h3>
        <p className="text-body text-text-muted">
          Review this creator&rsquo;s audience and recent content before booking.
        </p>
        <div className="flex flex-wrap gap-s2">
          {topJob && (
            <CheckChip>
              {topJob.percentage}% {topJob.label} in the audience
            </CheckChip>
          )}
          <CheckChip>
            {formatCompactNumber(creator.medianViews)} typical reach
          </CheckChip>
        </div>
      </div>

      <section className="flex flex-col gap-s4">
        <div className="flex flex-wrap items-baseline justify-between gap-s2">
          <h3 className="text-card-title text-text">Audience snapshot</h3>
          <span className="text-label text-text-muted">
            Estimated from {creator.observedEngagerCount} recent public engagers
          </span>
        </div>
        <div className="grid gap-s6 sm:grid-cols-2">
          <div className="flex flex-col gap-s3">
            <span className="text-label text-text-muted">Job title</span>
            <SegmentedBar segments={jobTitle} />
          </div>
          <div className="flex flex-col gap-s3">
            <span className="text-label text-text-muted">Seniority</span>
            <SegmentedBar segments={seniority} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-s4">
        <h3 className="text-card-title text-text">Content performance</h3>
        <div className="grid items-start gap-s4 lg:grid-cols-2">
          <div className="rounded-card border border-border p-s4">
            <ReachSparkline posts={creator.posts} />
          </div>
          {recentPost && (
            <div className="flex flex-col gap-s3 rounded-card border border-border p-s4">
              <div className="flex items-center gap-s3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-label text-primary">
                  {initials(creator.displayName)}
                </span>
                <div className="min-w-0">
                  <p className="text-body font-medium text-text">
                    {creator.displayName}
                  </p>
                  <p className="text-label text-text-muted">
                    {new Date(recentPost.publishedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <a
                  href={recentPost.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto shrink-0 text-label font-medium text-primary"
                >
                  Open original
                </a>
              </div>
              <p
                className={
                  postExpanded
                    ? "whitespace-pre-line text-body text-text"
                    : "line-clamp-3 text-body text-text"
                }
              >
                {postExpanded
                  ? recentPost.content
                  : recentPost.content.replace(/\s+/g, " ")}
              </p>
              <button
                type="button"
                onClick={() => setPostExpanded((value) => !value)}
                className="self-start text-label font-medium text-primary"
              >
                {postExpanded ? "Show less" : "See full post"}
              </button>
              <div className="flex flex-wrap gap-s4 border-t border-border pt-s3 text-label tabular-nums text-text-muted">
                <span>{formatCompactNumber(recentPost.views)} views</span>
                <span>{formatCompactNumber(recentPost.reactions)} reactions</span>
                <span>{formatCompactNumber(recentPost.comments)} comments</span>
                <span>{formatCompactNumber(recentPost.reposts)} reposts</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="rounded-card border border-border p-s4">
        <Disclosure summary="Professional profile">
          <dl className="grid gap-s3 text-body sm:grid-cols-2">
            <Fact label="Focus" value={verticalLabel(creator.vertical)} />
            <Fact
              label="Network"
              value={creator.network === "LINKEDIN" ? "LinkedIn" : "X"}
            />
            <Fact
              label="Followers"
              value={formatCompactNumber(creator.followerCount)}
            />
            <Fact
              label="Engagement rate"
              value={formatPercent(creator.engagementRate)}
            />
            <Fact label="Country" value={creator.country} />
            <Fact label="Language" value={creator.language.toUpperCase()} />
          </dl>
          <p className="mt-s3 text-body text-text-muted">{creator.headline}</p>
        </Disclosure>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-s3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="tabular-nums text-text">{value}</dd>
    </div>
  );
}
