import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CreatorProfileDetail } from "@naano/shared";
import { Avatar } from "../../ui/Avatar";
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

function postDateRangeLabel(posts: CreatorProfileDetail["posts"]): string | null {
  if (posts.length === 0) return null;
  const format = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  // posts arrive newest-first; the oldest is the last one.
  const newest = posts[0]!;
  const oldest = posts[posts.length - 1]!;
  const count = `${posts.length} post${posts.length === 1 ? "" : "s"}`;
  if (posts.length === 1) return `${count}, ${format(newest.publishedAt)}`;
  return `${count}, ${format(oldest.publishedAt)} – ${format(newest.publishedAt)}`;
}

export function OverviewTab({ creator }: OverviewTabProps): JSX.Element {
  const [postIndex, setPostIndex] = useState(0);
  const [postExpanded, setPostExpanded] = useState(false);

  // A different creator's posts array is a different set entirely — always
  // land on their newest post, not wherever the pager was left.
  useEffect(() => {
    setPostIndex(0);
    setPostExpanded(false);
  }, [creator.id]);

  const jobTitle = segmentsFor(creator, "JOB_TITLE");
  const seniority = segmentsFor(creator, "SENIORITY");
  const topJob = jobTitle[0];
  const posts = creator.posts;
  const recentPost = posts[postIndex];
  const dateRangeLabel = postDateRangeLabel(posts);

  function goToPost(delta: number): void {
    setPostIndex((current) => Math.min(Math.max(current + delta, 0), posts.length - 1));
    setPostExpanded(false);
  }

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
        <div className="flex flex-wrap items-baseline justify-between gap-s2">
          <h3 className="text-card-title text-text">Content performance</h3>
          {dateRangeLabel && (
            <span className="text-label text-text-muted">{dateRangeLabel}</span>
          )}
        </div>
        <div className="grid items-start gap-s4 lg:grid-cols-2">
          <div className="rounded-card border border-border p-s4">
            <ReachSparkline posts={creator.posts} />
          </div>
          {recentPost && (
            <div className="flex flex-col gap-s3 rounded-card border border-border p-s4">
              <div className="flex items-center gap-s3">
                <Avatar
                  src={creator.avatarUrl}
                  name={creator.displayName}
                  className="h-9 w-9"
                  initialsClassName="text-label"
                />
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
              {posts.length > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-s3">
                  <span className="text-label text-text-muted">
                    {postIndex + 1} of {posts.length}
                  </span>
                  <div className="flex items-center gap-s2">
                    <button
                      type="button"
                      onClick={() => goToPost(-1)}
                      disabled={postIndex === 0}
                      aria-label="Previous post"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-control border border-border text-text-muted transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-40"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                        <path
                          d="M10 3.5 5 8l5 4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => goToPost(1)}
                      disabled={postIndex === posts.length - 1}
                      aria-label="Next post"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-control border border-border text-text-muted transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-40"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                        <path
                          d="M6 3.5 11 8l-5 4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
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
